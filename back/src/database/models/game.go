package models

import (
	"time"

	"github.com/google/uuid"
)

type Game struct {
	ID           uuid.UUID `json:"game_id" db:"game_id"`
	WhiteID      uuid.UUID `json:"white_id" db:"white_id"`
	BlackID      uuid.UUID `json:"black_id" db:"black_id"`
	PGN          string    `json:"pgn" db:"pgn"`
	Result       string    `json:"result" db:"result"`
	ResultReason string    `json:"result_reason" db:"result_reason"`
	Status       string    `json:"status" db:"status"`
	LastFEN      string    `json:"last_fen" db:"last_fen"`
	StartedAt    time.Time `json:"started_at" db:"started_at"`
	EndedAt      time.Time `json:"ended_at" db:"ended_at"`
}
