package utils

import (
	"net/mail"
	"strings"
)

func NormalizeEmail(email string) (string, error) {
	email = strings.ToLower(email)
	_, err := mail.ParseAddress(email)
	return email, err
}
