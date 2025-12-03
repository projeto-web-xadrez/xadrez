package authmanager

import (
	"context"
	"database"
	"database/models"
	"database/repositories"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AuthError string

const (
	ErrUserNotFound    AuthError = "user not found"
	ErrInvalidPassword AuthError = "invalid password"
	ErrInvalidToken    AuthError = "invalid token"
	ErrUnknown         AuthError = "unknown internal error"
	ErrUsernameExists  AuthError = "username already registered"
	ErrEmailExists     AuthError = "email already registered"
)

func (e AuthError) Error() string { return string(e) }

type Config struct {
	TokenDuration time.Duration
	MinLoginTime  time.Duration
}

type AuthManager struct {
	redis    *redis.Client
	userRepo *repositories.UserRepo
	config   *Config
}

func NewAuthManager(redis *redis.Client, userRepo *repositories.UserRepo, config *Config) *AuthManager {
	return &AuthManager{
		redis:    redis,
		userRepo: userRepo,
		config:   config,
	}
}

type Session struct {
	Token            string
	IP               string
	UserID           string
	Username         string
	Email            string
	SessionCreatedAt time.Time
	ExpiresAt        time.Time
}

func (am *AuthManager) parseSession(token string, data map[string]string) *Session {
	sessionCreatedAt, _ := time.Parse(time.RFC3339, data["session_created_at"])
	return &Session{
		Token:            token,
		IP:               data["ip"],
		UserID:           data["user_id"],
		Username:         data["username"],
		Email:            data["email"],
		SessionCreatedAt: sessionCreatedAt,
		ExpiresAt:        sessionCreatedAt.Add(am.config.TokenDuration),
	}
}

func (am *AuthManager) generateSessionFromUser(ctx context.Context, ip string, user *models.User) (*Session, error) {
	session := &Session{
		Token:            uuid.New().String(),
		IP:               ip,
		UserID:           user.ID.String(),
		Username:         user.Username,
		Email:            user.Email,
		SessionCreatedAt: time.Now(),
	}
	session.ExpiresAt = session.SessionCreatedAt.Add(am.config.TokenDuration)

	key := fmt.Sprintf("session:%s", session.Token)
	err := am.redis.HSet(ctx, key,
		"user_id", session.UserID,
		"ip", session.IP,
		"username", session.Username,
		"email", session.Email,
		"session_created_at", session.SessionCreatedAt.Format(time.RFC3339),
	).Err()

	if err != nil {
		return nil, ErrUnknown
	}

	err = am.redis.Expire(ctx, key, am.config.TokenDuration).Err()
	if err != nil {
		return nil, ErrUnknown
	}

	return session, nil
}

func (am *AuthManager) Login(ctx context.Context, ip string, email string, password string) (*models.User, *Session, error) {
	startTime := time.Now()

	user, err := am.userRepo.GetUserByEmail(ctx, email, true)
	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		return nil, nil, ErrUnknown
	}

	if user == nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		return nil, nil, ErrUserNotFound
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		return nil, nil, ErrInvalidPassword
	}

	session, err := am.generateSessionFromUser(ctx, ip, user)
	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		return nil, nil, err
	}

	user.PasswordHash = ""
	return user, session, nil
}

func (am *AuthManager) Register(ctx context.Context, ip string, email string, username string, password string) (*models.User, *Session, error) {
	startTime := time.Now()

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		return nil, nil, err
	}
	hashedPassword := string(hashedBytes)

	user, err := am.userRepo.CreateUser(ctx, username, email, hashedPassword, true)

	var conflictErr *database.ConflictError
	if errors.As(err, &conflictErr) {
		switch conflictErr.Constraint {
		case "user_email_key":
			return nil, nil, ErrEmailExists
		case "user_username_key":
			return nil, nil, ErrUsernameExists
		default:
			return nil, nil, ErrUnknown
		}
	}
	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		return nil, nil, ErrUnknown
	}

	session, err := am.generateSessionFromUser(ctx, ip, user)
	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}

		user.PasswordHash = ""
		return user, nil, err
	}

	user.PasswordHash = ""
	return user, session, nil
}

func (am *AuthManager) ChangePassword(ctx context.Context, ip string, email string, password string) (*models.User, *Session, error) {
	startTime := time.Now()

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		return nil, nil, err
	}
	hashedPassword := string(hashedBytes)

	user, err := am.userRepo.UpdateUserPasswordByEmail(ctx, email, hashedPassword, true)

	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		return nil, nil, ErrUnknown
	}

	session, err := am.generateSessionFromUser(ctx, ip, user)
	if err != nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < am.config.MinLoginTime {
			time.Sleep(am.config.MinLoginTime - elapsedTime)
		}
		user.PasswordHash = ""
		return user, nil, err
	}

	user.PasswordHash = ""
	return user, session, nil
}

func (am *AuthManager) GetSession(ctx context.Context, token string) (*Session, error) {
	key := fmt.Sprintf("session:%s", token)
	data, err := am.redis.HGetAll(ctx, key).Result()

	if err == redis.Nil {
		return nil, nil
	} else if err != nil {
		return nil, err
	}

	return am.parseSession(token, data), nil
}
