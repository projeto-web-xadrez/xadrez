package verificationmanager

import (
	"errors"
	"fmt"
	"math/rand/v2"
	"sync"
	"time"

	"github.com/google/uuid"
)

type tokenInterface struct {
	Token            string
	VerificationCode string
	Type             string
	Expiration       time.Time
	CurrentTries     int
	MaxTries         int
	Function         interface{}
}

type VerificationManager struct {
	tokens map[string]tokenInterface
	mu     sync.Mutex
}

func NewVerificationManager(garbageCollectorInterval time.Duration) *VerificationManager {
	vm := VerificationManager{
		tokens: make(map[string]tokenInterface),
	}

	go func() {
		for {
			time.Sleep(garbageCollectorInterval)
			vm.mu.Lock()
			for _, cInterface := range vm.tokens {
				if cInterface.Expiration.After(time.Now()) {
					delete(vm.tokens, cInterface.Token)
				}
			}
			vm.mu.Unlock()
		}
	}()

	return &vm
}

func GenerateFakeToken() string {
	return uuid.NewString()
}

func makeToken(function interface{}, tokenType string, duration time.Duration, maxTries int) tokenInterface {
	return tokenInterface{
		Token:            uuid.NewString(),
		Type:             tokenType,
		VerificationCode: fmt.Sprintf("%06d", rand.IntN(1000000)),
		Expiration:       time.Now().Add(duration),
		MaxTries:         maxTries,
		CurrentTries:     0,
		Function:         function,
	}
}

func (tokenManager *VerificationManager) RegisterToken(function interface{}, tokenType string, duration time.Duration) *tokenInterface {
	tokenManager.mu.Lock()
	defer tokenManager.mu.Unlock()

	token := makeToken(function, tokenType, duration, 5)
	tokenManager.tokens[token.Token] = token

	return &token
}

func (tokenManager *VerificationManager) RetrieveFunction(token string, tokenType string, code string) (interface{}, error) {
	tokenManager.mu.Lock()
	defer tokenManager.mu.Unlock()
	tokenInterface, ok := tokenManager.tokens[token]
	if !ok {
		return nil, errors.New("token doesn't exist or is expired")
	}

	if tokenInterface.Type != tokenType {
		return nil, errors.New("invalid token type")
	}

	tokenInterface.CurrentTries++
	if tokenInterface.CurrentTries >= tokenInterface.MaxTries {
		delete(tokenManager.tokens, token)
		return nil, errors.New("max tries reached")
	}

	if tokenInterface.VerificationCode != code {
		return nil, errors.New("invalid code")
	}

	if time.Now().After(tokenInterface.Expiration) {
		delete(tokenManager.tokens, token)
		return nil, errors.New("code expired")
	}

	delete(tokenManager.tokens, token)
	return tokenInterface.Function, nil
}
