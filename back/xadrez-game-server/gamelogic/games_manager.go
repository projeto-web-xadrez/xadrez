package gamelogic

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var rooms map[string]*Room
var roomsMutex sync.RWMutex

var players map[string]*Player
var playersMutex sync.RWMutex

func convertSquare(squareStr string) *chess.Square {
	if len(squareStr) != 2 {
		return nil
	}
	if squareStr[0] < 'a' || squareStr[0] > 'h' {
		return nil
	}
	if squareStr[1] < '1' || squareStr[1] > '8' {
		return nil
	}
	square := chess.NewSquare(chess.File(squareStr[0]-'a'), chess.Rank(squareStr[1]-'1'))
	return &square
}

func getRoom(roomID string) *Room {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	return rooms[roomID]
}

func getPlayer(playerID string) *Player {
	playersMutex.Lock()
	defer playersMutex.Unlock()
	return players[playerID]
}

func HandleNewClient(ws *websocket.Conn) {
	defer ws.Close()

	var msg Message
	err := ws.ReadJSON(&msg)
	if err != nil || msg.Type != "init" {
		return
	}

	var initMsg InitMessage
	err = json.Unmarshal([]byte(msg.Data), &initMsg)
	if err != nil {
		return
	}

	player := getPlayer(initMsg.PlayerID)
	if player == nil {
		return
	}

	player.Mutex.Lock()
	if player.Connected {
		// TODO: enviar mensagem "você se conectou por outra tab"
		close(player.WSSend)
		player.Connection.Close()
	}

	room := player.Room
	if room == nil {
		// TODO: enviar mensagem "você não está em nenhuma sala"
		ws.Close()
		player.Connection = nil
		return
	}

	player.Connected = true
	player.Connection = ws
	player.LastConnection = time.Now()
	player.WSSend = make(chan Message, 100)

	go func() {
		for {
			err := ws.WriteJSON(<-player.WSSend)
			if err != nil {
				player.Mutex.Lock()
				defer player.Mutex.Unlock()
				if ws != player.Connection {
					return
				}

				player.Connected = false
				close(player.WSSend)
				ws.Close()
				player.Connection = nil
				return
			}
		}
	}()

	player.Mutex.Unlock()

	defer func() {
		player.Mutex.Lock()
		player.Connected = false
		close(player.WSSend)
		ws.Close()
		player.Connection = nil
		player.Mutex.Unlock()
	}()

	room.Mutex.Lock()

	var opponent *Player
	if room.Players[0].ID == player.ID {
		opponent = room.Players[1]
	} else {
		opponent = room.Players[0]
	}

	welcomeMessage := WelcomeContextMessage{
		RoomID:     room.RoomID,
		Color:      player.Color.String()[0],
		OpponentID: opponent.ID,
		GameFEN:    room.Game.FEN(),
		LastMoveS1: room.LastMoveS1.String(),
		LastMoveS2: room.LastMoveS2.String(),
		GameStatus: room.Status.String(),
		Winner:     room.Winner,
	}

	room.Mutex.Unlock()

	jsonData, _ := json.Marshal(welcomeMessage)
	player.WSSend <- Message{
		Type: "welcome",
		Data: string(jsonData),
	}

	room.Mutex.Lock()
	if room.Status == GameEnded {
		room.Mutex.Unlock()
		return
	}

	if room.Status == WaitingPlayers {
		opponent.Mutex.RLock()
		both_connected := !opponent.LastConnection.IsZero()
		opponent.Mutex.RUnlock()

		if both_connected {
			room.Status = GameStarted
			if opponent.Connected {
				opponent.WSSend <- Message{
					Type: "game_started",
					Data: "",
				}
			}
			player.WSSend <- Message{
				Type: "game_started",
				Data: "",
			}
		}
	}

	var whitePlayer, blackPlayer *Player
	if room.Players[0].Color == chess.White {
		whitePlayer = room.Players[0]
		blackPlayer = room.Players[1]
	} else {
		whitePlayer = room.Players[1]
		blackPlayer = room.Players[0]
	}

	room.Mutex.Unlock()

	opponentWin := func() {
		room.Mutex.Lock()
		room.Status = GameEnded
		room.Winner = opponent.ID

		gameEndMessage := GameEndedMessage{
			Winner: room.Winner,
		}
		room.Mutex.Unlock()

		jsonData, _ := json.Marshal(gameEndMessage)
		msg = Message{
			Type: "game_ended",
			Data: string(jsonData),
		}

		room.Players[0].WSSend <- msg
		room.Players[1].WSSend <- msg
	}

	for {
		err = ws.ReadJSON(msg)
		if err != nil {
			opponentWin() // Invalid message, opponent must win
			return
		}

		switch msg.Type {
		case "player_moved":
			var moveMsg PlayerMovedMessage
			err = json.Unmarshal([]byte(msg.Data), &moveMsg)
			if err != nil || room.Status != GameStarted {
				opponentWin() // Malformed message, opponent must win
				return
			}

			if len(moveMsg.MoveS1) != 2 || len(moveMsg.MoveS2) != 2 {
				opponentWin() // Malformed move, opponent must win
				return
			}

			s1 := convertSquare(moveMsg.MoveS1)
			s2 := convertSquare(moveMsg.MoveS2)
			if s1 == nil || s2 == nil {
				opponentWin() // Malformed squares, opponent must win
				return
			}

			room.Mutex.Lock()

			if room.Game.CurrentPosition().Turn() != player.Color {
				opponentWin() // Not his turn, opponent must win
				return
			}

			err = room.Game.PushNotationMove(moveMsg.MoveNotation, chess.AlgebraicNotation{}, nil)
			if err != nil {
				opponentWin() // Invalid move, opponent must win
				return
			}

			room.LastMoveS1 = *s1
			room.LastMoveS2 = *s2

			outcome := room.Game.Outcome()
			if outcome != chess.NoOutcome {
				switch outcome {
				case chess.Draw:
					room.Winner = "draw"
				case chess.BlackWon:
					room.Winner = blackPlayer.ID
				case chess.WhiteWon:
					room.Winner = whitePlayer.ID
				case chess.UnknownOutcome:
					fmt.Println(room.Game)
					fmt.Println(room.Game.FEN())
					panic("We got an unknown outcome")
				}

				gameEndMessage := GameEndedMessage{
					Winner: room.Winner,
				}
				jsonData, _ := json.Marshal(gameEndMessage)
				winMsg := Message{
					Type: "game_ended",
					Data: string(jsonData),
				}

				opponent.WSSend <- msg
				opponent.WSSend <- winMsg
				player.WSSend <- winMsg
				room.Status = GameEnded

				room.Mutex.Unlock()
				return
			}

			room.Mutex.Unlock()
			opponent.WSSend <- msg
		}
	}
}

func CreateNewRoom(playerID1 string, playerID2 string) (*Room, error) {
	p1 := getPlayer(playerID1)
	p2 := getPlayer(playerID2)

	if p1 != nil && p1.Room != nil {
		return nil, errors.New("Player 1 is already in a room")
	}

	if p2 != nil && p2.Room != nil {
		return nil, errors.New("Player 2 is already in a room")
	}

	room := &Room{
		Mutex:   sync.RWMutex{},
		RoomID:  uuid.New().String(),
		Players: [2]*Player{},
		Status:  WaitingPlayers,
		Game:    chess.NewGame(),
	}

	roomsMutex.Lock()
	rooms[room.RoomID] = room
	roomsMutex.Unlock()

	var p1Color, p2Color chess.Color
	if rand.Intn(2) == 1 {
		p1Color = chess.White
		p2Color = chess.Black
	} else {
		p1Color = chess.Black
		p2Color = chess.White
	}

	p1 = &Player{
		ID:        playerID1,
		Connected: false,
		Room:      room,
		Mutex:     sync.RWMutex{},
		Color:     p1Color,
		WSSend:    make(chan Message, 100),
	}
	p2 = &Player{
		ID:        playerID2,
		Connected: false,
		Room:      room,
		Mutex:     sync.RWMutex{},
		Color:     p2Color,
		WSSend:    make(chan Message, 100),
	}

	room.Players[0] = p1
	room.Players[1] = p2

	playersMutex.Lock()
	players[playerID1] = p1
	players[playerID2] = p2
	playersMutex.Unlock()

	room.Mutex.Unlock()

	return room, nil
}
