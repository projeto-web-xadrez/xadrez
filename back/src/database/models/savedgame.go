package models

import (
	"time"

	"github.com/google/uuid"
)

type SavedGame struct {
	ID        uuid.UUID `db:"game_id"`
	UserID    uuid.UUID `db:"user_id"`
	Name      string    `db:"name"`
	PGN       string    `db:"pgn"`
	LastFEN   string    `db:"last_fen"`
	CreatedAt time.Time `db:"created_at"`
}
