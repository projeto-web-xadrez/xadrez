package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID  `db:"user_id" json:"id"`
	Username     string     `db:"username" json:"username"`
	Email        string     `db:"email" json:"email,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at,omitempty"`
	PasswordHash string     `db:"password_hash" json:"-"`
	Stats        *UserStats `db:"-" json:"stats,omitempty"`
}

type UserStats struct {
	ID          uuid.UUID `db:"user_id" json:"-"`
	Wins        int       `db:"wins" json:"wins"`
	Draws       int       `db:"draws" json:"draws"`
	Losses      int       `db:"losses" json:"losses"`
	GamesPlayed int       `db:"games_played" json:"games_played"`
	LastUpdated time.Time `db:"last_updated" json:"last_updated,omitempty"`
}
