package gamelogic

import (
	"sync"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/gorilla/websocket"
)

type Player struct {
	ID             string
	Connected      bool
	Connection     *websocket.Conn
	LastConnection time.Time
	Room           *Room
	WSSend         chan Message
	Mutex          sync.RWMutex
	Color          chess.Color
}
