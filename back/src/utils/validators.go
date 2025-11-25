package utils

import (
	"net/mail"
	"strings"
	"unicode"
)

var MAXIMUM_PASSWORD_LENGTH = (8 * 1024)

func ValidateUsername(username string) bool {
	// Username must have at least 3 characters and 20 at maximum
	if len(username) < 3 || len(username) > 20 {
		return false
	}

	// First char must be a letter
	if !(username[0] >= 'A' && username[0] <= 'Z') &&
		!(username[0] >= 'a' && username[0] <= 'z') {
		return false
	}

	// Username must only contain the following characters:
	whitelist := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
	for _, char := range username {
		if !strings.ContainsRune(whitelist, char) {
			return false
		}
	}

	return true
}

func ValidateEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// Password has to have at least 8 chars, an uppercase char, a lowercase char, a digit and a special char
func ValidatePassword(password string) bool {
	if len(password) < 8 || len(password) > MAXIMUM_PASSWORD_LENGTH {
		return false
	}

	hasUpperCase := false
	hasLowerCase := false
	hasDigit := false
	hasSpecial := false
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpperCase = true
		case unicode.IsLower(char):
			hasLowerCase = true
		case unicode.IsDigit(char):
			hasDigit = true
		case !unicode.IsLetter(char) && !unicode.IsDigit(char):
			hasSpecial = true
		}
	}

	return hasUpperCase && hasLowerCase && hasDigit && hasSpecial
}
