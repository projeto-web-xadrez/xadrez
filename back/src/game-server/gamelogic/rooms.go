package gamelogic

import (
	"sync"

	"github.com/corentings/chess/v2"
)

type RoomStatus uint8

const (
	WaitingPlayers RoomStatus = iota
	GameStarted
	GameEnded
)

func (status RoomStatus) String() string {
	switch status {
	case WaitingPlayers:
		return "waiting"
	case GameStarted:
		return "started"
	case GameEnded:
		return "ended"
	}
	return ""
}

type Room struct {
	RoomID     string
	Players    [2]*Player
	Status     RoomStatus
	Game       *chess.Game
	Mutex      sync.RWMutex
	LastMoveS1 chess.Square
	LastMoveS2 chess.Square
	Winner     string
}
