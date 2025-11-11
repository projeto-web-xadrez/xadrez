package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID
	Username     string
	Email        string
	CreatedAt    time.Time
	PasswordHash string
}
