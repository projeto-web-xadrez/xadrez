package gamelogic

import "sync"

type RoomStatus uint8

const (
	WaitingPlayers RoomStatus = iota
	GameStarted
	GameEnded
)

type Room struct {
	RoomId  string
	Players [2]*Player
	Status  RoomStatus
	mutex   sync.RWMutex
}
