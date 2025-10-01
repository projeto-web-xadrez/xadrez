package gamelogic

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var rooms map[string]*Room
var rooms_mutex sync.RWMutex

var players_to_room map[string]*Room
var players_to_room_mutex sync.RWMutex

var players map[string]*Player
var players_mutex sync.RWMutex

func getRoom(room_id string) *Room {
	rooms_mutex.Lock()
	defer rooms_mutex.Unlock()
	return rooms[room_id]
}

func getRoomByPlayer(player_id string) *Room {
	players_to_room_mutex.Lock()
	defer players_to_room_mutex.Unlock()
	return players_to_room[player_id]
}

func getPlayer(player_id string) *Player {
	players_mutex.Lock()
	defer players_mutex.Unlock()
	return players[player_id]
}

func HandleNewClient(ws *websocket.Conn) {
	defer ws.Close()

	var msg Message
	err := ws.ReadJSON(&msg)
	if err != nil || msg.Type != "init" {
		return
	}

	var init_msg InitMessage
	err = json.Unmarshal([]byte(msg.Data), &init_msg)
	if err != nil {
		return
	}

	player := getPlayer(init_msg.PlayerId)
	if player == nil {
		return
	}

	player.mutex.Lock()
	if player.connected {
		// TODO: enviar mensagem "você se conectou por outra tab"
		close(player.send)
		player.connection.Close()
	}

	room := player.room
	if room == nil {
		// TODO: enviar mensagem "você não está em nenhuma sala"
		ws.Close()
		player.connection = nil
		return
	}

	player.connected = true
	player.connection = ws
	player.lastConnection = time.Now()
	player.send = make(chan Message, 8)

	go func() {
		for {
			err := ws.WriteJSON(<-player.send)
			if err != nil {
				player.mutex.Lock()
				defer player.mutex.Unlock()
				if ws != player.connection {
					return
				}

				player.connected = false
				close(player.send)
				ws.Close()
				player.connection = nil
				return
			}
		}
	}()

	// TODO: enviar WelcomeContextMessage

	player.mutex.Unlock()

	room.mutex.Lock()
	if room.Status == GameEnded {
		player.mutex.Lock()
		player.connected = false
		close(player.send)
		ws.Close()
		player.connection = nil
		player.mutex.Unlock()
		room.mutex.Unlock()
		return
	}

	var enemy *Player
	if room.Players[0].id == player.id {
		enemy = room.Players[1]
	} else {
		enemy = room.Players[0]
	}

	if room.Status == WaitingPlayers {
		enemy.mutex.RLock()
		if !enemy.lastConnection.IsZero() {
			room.Status = GameStarted
			if enemy.connected {
				enemy.send <- Message{
					Type: "game_started",
					Data: "",
				}
			}
			player.send <- Message{
				Type: "game_started",
				Data: "",
			}
		}
		enemy.mutex.RUnlock()
	}
	room.mutex.Unlock()

	for {
		err = ws.ReadJSON(msg)
		if err != nil {
			players_mutex.Lock()
			player.connected = false
			close(player.send)
			ws.Close()
			player.connection = nil
			players_mutex.Unlock()
			return
		}

		switch msg.Type {
		case "player_moved":
			// TODO: check turn, check move, make move and send to enemy
			enemy.send <- msg
		}
	}
}

func HandleCreateNewRoom() {

}
