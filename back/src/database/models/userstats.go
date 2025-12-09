package models

import (
	"time"

	"github.com/google/uuid"
)

type UserStats struct {
	ID          uuid.UUID `db:"user_id" json:"user_id"`
	Wins        int       `db:"wins" json:"wins"`
	Draws       int       `db:"draws" json:"draws"`
	Losses      int       `db:"losses" json:"losses"`
	GamesPlayed int       `db:"games_played" json:"games_played"`
	LastUpdated time.Time `db:"last_updated" json:"last_updated"`
}
