package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"

	"errors"

	"golang.org/x/crypto/bcrypt"
)

type AuthError struct {
	StatusCode int
	Err        error
}

func (r *AuthError) Error() string {
	return fmt.Sprintf("\nstatus %d err %v\n", r.StatusCode, r.Err)
}

func hashPass(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 15)
	return string(bytes), err
}

func compPass(password string, hashedPass string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPass), []byte(password))
	return err == nil
}

func genToken(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		log.Fatalf("Failed to generate user token: %v", err)
	}

	return base64.URLEncoding.EncodeToString(bytes)
}

func Authorize(r *http.Request) error {
	session_token, err := r.Cookie("session_token")

	if err != nil {
		return &AuthError{
			StatusCode: http.StatusUnauthorized,
			Err:        errors.New("Session token not present"),
		}
	}

	session, ok := sessions[session_token.Value]
	if !ok {
		return &AuthError{
			StatusCode: http.StatusUnauthorized,
			Err:        errors.New("Session token is not valid"),
		}
	}

	csrf := r.Header.Get("X-CSRF-Token")

	if csrf == "" || csrf != session.CSRFTToken {
		return &AuthError{
			StatusCode: http.StatusUnauthorized,
			Err:        errors.New("CSRF token different than expected"),
		}
	}

	return nil
}
