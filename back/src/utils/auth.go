package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

func GenerateCSRFToken(sessionToken string) string {
	key := GetEnvVarOrPanic("CSRF_HASH_KEY", "CSRF Token Hash Key")
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(sessionToken))
	return hex.EncodeToString(h.Sum(nil))
}

func ValidateCSRFToken(csrfToken string, sessionToken string) bool {
	expected := GenerateCSRFToken(sessionToken)
	return hmac.Equal([]byte(csrfToken), []byte(expected))
}
