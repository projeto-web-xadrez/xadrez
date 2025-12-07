package models

import (
	"time"

	"github.com/google/uuid"
)

type SavedGame struct {
	ID        uuid.UUID `json:"game_id" db:"game_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Name      string    `json:"name" db:"name"`
	PGN       string    `json:"pgn" db:"pgn"`
	LastFEN   string    `json:"last_fen" db:"last_fen"`
	CreatedAt time.Time `db:"created_at"`
}
