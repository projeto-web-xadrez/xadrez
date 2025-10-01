package gamelogic

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Player struct {
	id             string
	connected      bool
	connection     *websocket.Conn
	lastConnection time.Time
	room           *Room
	send           chan Message
	mutex          sync.RWMutex
	color          uint8
}
