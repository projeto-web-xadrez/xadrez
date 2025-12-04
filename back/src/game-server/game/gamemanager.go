package game

import (
	"context"
	"database/repositories"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

type GameManager struct {
	players  map[uuid.UUID]*Player
	games    map[uuid.UUID]*Game
	mutex    sync.RWMutex
	userRepo *repositories.UserRepo
}

func NewGameManager(userRepo *repositories.UserRepo) *GameManager {
	return &GameManager{
		players:  map[uuid.UUID]*Player{},
		games:    map[uuid.UUID]*Game{},
		mutex:    sync.RWMutex{},
		userRepo: userRepo,
	}
}

func (gm *GameManager) getPlayerNoLock(id uuid.UUID) *Player {
	player, ok := gm.players[id]
	if !ok {
		return nil
	}
	return player
}

func (gm *GameManager) GetOrMakePlayer(id uuid.UUID, username string) *Player {
	var player *Player
	gm.mutex.RLock()
	player, ok := gm.players[id]
	gm.mutex.RUnlock()
	if ok {
		return player
	}
	gm.mutex.Lock()
	defer gm.mutex.Unlock()
	p := NewPlayer(gm, id, username)
	gm.players[p.ID] = p
	return p
}

func (gm *GameManager) getGame(id uuid.UUID) *Game {
	gm.mutex.RLock()
	defer gm.mutex.RUnlock()
	game, ok := gm.games[id]
	if !ok {
		return nil
	}
	return game
}

func (gm *GameManager) CreateNewGame(playerID1 uuid.UUID, playerID2 uuid.UUID) (*Game, error) {

	gm.mutex.RLock()
	p1 := gm.getPlayerNoLock(playerID1)
	p2 := gm.getPlayerNoLock(playerID2)
	gm.mutex.RUnlock()

	if p1 != nil {
		p1.mutex.Lock()
		defer p1.mutex.Unlock()
		if p1.OngoingGame != nil {
			ended := false

			p1.OngoingGame.mutex.RLock()
			ended = p1.OngoingGame.Status == GameEnded
			p1.OngoingGame.mutex.RUnlock()
			if !ended {
				return nil, errors.New("Player 1 is already in a room")
			}
		}
	}

	if p2 != nil {
		p2.mutex.Lock()
		defer p2.mutex.Unlock()
		if p2.OngoingGame != nil {
			ended := false
			p2.OngoingGame.mutex.RLock()
			ended = p2.OngoingGame.Status == GameEnded
			p2.OngoingGame.mutex.RUnlock()
			if !ended {
				return nil, errors.New("Player 2 is already in a room")
			}
		}
	}

	gameId := uuid.New()
	if p1 != nil {
		p1.SendMessageNoLock(newQuitMessage("NewGameStarted: " + gameId.String()))
	} else {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		user1, err := gm.userRepo.GetUserByID(ctx, playerID1, false)
		if err != nil {
			return nil, err
		}

		p1 = NewPlayer(gm, playerID1, user1.Username)
		p1.mutex.Lock()
		defer p1.mutex.Unlock()
	}

	if p2 != nil {
		p2.SendMessageNoLock(newQuitMessage("NewGameStarted: " + gameId.String()))
	} else {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		user2, err := gm.userRepo.GetUserByID(ctx, playerID2, false)
		if err != nil {
			return nil, err
		}

		p2 = NewPlayer(gm, playerID2, user2.Username)
		p2.mutex.Lock()
		defer p2.mutex.Unlock()
	}

	game := NewGame(gameId, p1, p2)
	game.mutex.Lock()
	defer game.mutex.Unlock()

	p1.OngoingGame = game
	p2.OngoingGame = game

	gm.mutex.Lock()
	gm.games[game.ID] = game
	gm.players[p1.ID] = p1
	gm.players[p2.ID] = p2
	gm.mutex.Unlock()
	return game, nil
}
