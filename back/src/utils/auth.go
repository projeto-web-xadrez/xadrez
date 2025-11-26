package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"os"
)

func GenerateCSRFToken(sessionToken string) string {
	h := hmac.New(sha256.New, []byte(os.Getenv("CSRF_HASH_KEY")))
	h.Write([]byte(sessionToken))
	return hex.EncodeToString(h.Sum(nil))
}

func ValidateCSRFToken(csrfToken string, sessionToken string) bool {
	expected := GenerateCSRFToken(sessionToken)
	return hmac.Equal([]byte(csrfToken), []byte(expected))
}
