package gamelogic

import (
	"database/models"
	"sync"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Player struct {
	ID             uuid.UUID
	User           *models.User
	Connected      bool
	Connection     *websocket.Conn
	LastConnection time.Time
	Room           *Room
	WSSend         *(chan Message)
	Mutex          sync.RWMutex
	Color          chess.Color
	Type           string
}
