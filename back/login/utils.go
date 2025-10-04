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
	username := r.FormValue("username")
	user, ok := users[username]
	if !ok {
		return &AuthError{
			StatusCode: http.StatusUnauthorized,
			Err:        errors.New("User not registered"),
		}
	}

	session_token, err := r.Cookie("session_token")
	//fmt.Println("Expected %s : got %s", user.Token, session_token.Value)
	// Identifica quando o token não é valido ou se houve algum erro para pega-lo
	if err != nil || session_token.Value == "" || session_token.Value != user.Token {
		return &AuthError{
			StatusCode: http.StatusUnauthorized,
			Err:        errors.New("Session token different from expected"),
		}
	}

	csrf := r.Header.Get("X-CSRF-Token")

	if csrf == "" || csrf != user.CSRFTToken {
		return &AuthError{
			StatusCode: http.StatusUnauthorized,
			Err:        errors.New("CSRF token different than expected"),
		}
	}

	return nil
}
