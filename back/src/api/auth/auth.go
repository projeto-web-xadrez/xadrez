package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"proto-generated/auth_grpc"
	"time"
	"utils"

	"github.com/google/uuid"
)

var AuthGrpc auth_grpc.AuthClient

func ValidateWithLoginServer(r *http.Request) (*auth_grpc.UserLoggedIn, error) {
	sessionCookie, err := r.Cookie("session_token")
	if err != nil {
		return nil, errors.New("No session token")
	}

	csrfToken := r.Header.Get("X-CSRF-Token")
	if csrfToken == "" {
		csrfToken = r.URL.Query().Get("csrfToken")
	}

	if csrfToken == "" {
		return nil, errors.New("No CSRF token")
	}

	if !utils.ValidateCSRFToken(csrfToken, sessionCookie.Value) {
		return nil, errors.New("Invalid session/CSRF token pair")
	}

	return AuthGrpc.ValidateSession(context.Background(), &auth_grpc.SessionValidationInput{
		Token: sessionCookie.Value,
	})
}

// autentica o usuario via http e depois permite que a conexao receba o upgrade para websocket
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userData, err := ValidateWithLoginServer(r)

		if err != nil || userData.Res == nil || !userData.Res.Ok || userData.Session == nil || userData.Session.UserId == "" {
			fmt.Println("Client session was not valid")

			http.SetCookie(w, &http.Cookie{
				Name:     "session_token",
				Value:    "",
				Expires:  time.Now().Add(-time.Hour),
				HttpOnly: true,
				Path:     "/",
				SameSite: http.SameSiteLaxMode,
			})

			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := r.Context()
		ctx = context.WithValue(ctx, "clientId", uuid.MustParse(userData.Session.UserId))
		ctx = context.WithValue(ctx, "username", userData.Session.Username)
		ctx = context.WithValue(ctx, "email", userData.Session.Email)

		next(w, r.WithContext(ctx))
	}
}
