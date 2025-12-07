package game

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Player struct {
	ID                  uuid.UUID
	Username            string
	Connected           bool
	LastPingRequest     time.Time
	LastPingResponse    time.Time
	OngoingGame         *Game
	Connection          *websocket.Conn
	initMessageReceived bool
	wsChannel           *(chan Message)
	mutex               sync.RWMutex
	gm                  *GameManager
}

func (p *Player) HandleMessage(message Message) bool {
	switch message.Type {
	case "init":
		if p.initMessageReceived {
			return false
		}

		var initMsg InitMessage
		err := json.Unmarshal([]byte(message.Data), &initMsg)
		if err != nil {
			return false
		}

		p.mutex.Lock()
		game := p.OngoingGame
		if game != nil {

			game.mutex.RLock()
			ended := game.Status == GameEnded

			game.mutex.RUnlock()
			if ended {
				game = nil
				p.OngoingGame = nil
			}
		}
		p.mutex.Unlock()

		if game == nil {
			gameId, err := uuid.Parse(initMsg.RoomID)
			if err != nil {
				return false
			}
			game = p.gm.getGame(gameId)
			if game == nil {
				return false
			}
		}
		p.mutex.Lock()
		p.initMessageReceived = true
		p.mutex.Unlock()
		game.AddPlayer(p)
		return true
	case "player_moved":
		var game *Game
		p.mutex.RLock()
		if !p.initMessageReceived {
			p.mutex.RUnlock()
			return false
		}
		game = p.OngoingGame
		p.mutex.RUnlock()
		if game == nil {
			return false
		}
		var moveMsg PlayerMovedMessage
		err := json.Unmarshal([]byte(message.Data), &moveMsg)
		if err != nil {
			return false
		}

		return game.SendMove(p, moveMsg)
	case "resign":
		var game *Game
		p.mutex.RLock()
		if !p.initMessageReceived {
			p.mutex.RUnlock()
			return false
		}
		game = p.OngoingGame
		p.mutex.RUnlock()
		if game == nil {
			return false
		}
		return game.Resign(p)
	case "ping":
		return true
	}
	return true
}

func NewPlayer(gm *GameManager, id uuid.UUID, username string) *Player {
	trashChannel := make(chan Message, 100)
	return &Player{
		ID:                  id,
		wsChannel:           &trashChannel,
		mutex:               sync.RWMutex{},
		Username:            username,
		Connected:           false,
		LastPingRequest:     time.Now(),
		LastPingResponse:    time.Now().Add(time.Hour * 24 * 365),
		OngoingGame:         nil,
		Connection:          nil,
		initMessageReceived: false,
		gm:                  gm,
	}
}

func (p *Player) KillConnection() bool {
	p.mutex.Lock()
	ret := false
	if p.wsChannel != nil {
		p.SendMessage(newQuitMessage("Connection killed"))
		ret = true
	}
	p.mutex.Unlock()
	return ret
}

func (p *Player) OnWsClosed(conn *websocket.Conn) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	if conn == p.Connection {
		if p.wsChannel != nil {
			*p.wsChannel <- newQuitMessage("WS closed")
		}
		p.Connected = false
		p.Connection = nil
	}
}

func (p *Player) SendMessageNoLock(message Message) bool {
	channel := p.wsChannel
	if channel == nil {
		return false
	}
	*channel <- message
	return true
}

func (p *Player) SendMessage(message Message) bool {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.SendMessageNoLock(message)
}

func (p *Player) UpdateConnection(conn *websocket.Conn) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	currentConnectionAlive := true

	if p.wsChannel != nil {
		*p.wsChannel <- newQuitMessage("New connection")
	}
	if p.Connection != nil {
		p.Connection.Close()
		p.Connection = nil
	}

	p.initMessageReceived = false
	p.Connected = true
	p.Connection = conn
	wsChannel := make(chan Message, 100)
	p.wsChannel = &wsChannel
	p.LastPingResponse = time.Now()

	go func() {
		time.Sleep(3 * time.Second)

		p.mutex.RLock()
		if !p.initMessageReceived {
			wsChannel <- newQuitMessage("No init message")
		}
		p.mutex.RUnlock()
	}()

	go func() {
		for {
			message := <-wsChannel

			if message.Type == "quit" {
				currentConnectionAlive = false
				p.mutex.Lock()
				if p.Connection == conn {
					p.Connection = nil
					p.Connected = false
				}
				conn.Close()
				p.mutex.Unlock()
				return
			}

			err := conn.WriteJSON(message)
			if err != nil {
				currentConnectionAlive = false
				p.mutex.Lock()
				if p.Connection == conn {
					p.Connection = nil
					p.Connected = false
				}
				conn.Close()
				p.mutex.Unlock()
				return
			}

		}
	}()

	go func() {
		for {
			time.Sleep(5 * time.Second)

			if !currentConnectionAlive {
				return
			}

			p.mutex.Lock()

			if p.LastPingResponse.Before(p.LastPingRequest) {
				timeWithoutResponse := time.Since(p.LastPingRequest)

				if timeWithoutResponse > 12*time.Second {
					wsChannel <- newQuitMessage("No ping response")
					p.mutex.Unlock()
					return
				}
			}

			p.LastPingRequest = time.Now()
			p.mutex.Unlock()

			wsChannel <- Message{
				Type: "ping",
				Data: "",
			}
		}
	}()

	go func() {
		for {
			if !currentConnectionAlive {
				return
			}

			var msg Message
			err := conn.ReadJSON(&msg)

			if err != nil {
				fmt.Printf("Error parsing WS message from client: %v\n", err)
				wsChannel <- newQuitMessage("Error reading WS")
				return
			}

			if p.HandleMessage(msg) {
				p.mutex.Lock()
				p.LastPingResponse = time.Now()
				p.mutex.Unlock()
			} else {
				wsChannel <- newQuitMessage("Connection killed by handler")
				return
			}
		}
	}()

}

func (p *Player) SetGameIfNil(game *Game) *Game {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	if p.OngoingGame == nil {
		p.OngoingGame = game
		return game
	}
	return p.OngoingGame
}
