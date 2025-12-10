package game

import (
	"context"
	"database/models"
	"encoding/json"
	"fmt"
	"proto-generated/matchmaking_grpc"
	"sync"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/google/uuid"
)

type GameStatus uint8

const (
	WaitingPlayers GameStatus = iota
	GameOngoing
	GameEnded
)

func (status GameStatus) String() string {
	switch status {
	case WaitingPlayers:
		return "waiting"
	case GameOngoing:
		return "ongoing"
	case GameEnded:
		return "ended"
	}
	return ""
}

type Game struct {
	ID          uuid.UUID
	WhitePlayer *Player
	BlackPlayer *Player
	Spectators  map[uuid.UUID]*Player
	game        *chess.Game
	mutex       sync.RWMutex
	lastMoveS1  *chess.Square
	lastMoveS2  *chess.Square
	Winner      string
	Status      GameStatus
	whiteReady  bool
	blackReady  bool
	StartedAt   time.Time
}

func NewGame(id uuid.UUID, whitePlayer *Player, blackPlayer *Player) *Game {
	return &Game{
		ID:          id,
		WhitePlayer: whitePlayer,
		BlackPlayer: blackPlayer,
		game:        chess.NewGame(),
		mutex:       sync.RWMutex{},
		lastMoveS1:  nil,
		lastMoveS2:  nil,
		Spectators:  make(map[uuid.UUID]*Player),
		Winner:      "",
		Status:      WaitingPlayers,
		whiteReady:  false,
		blackReady:  false,
		StartedAt:   time.Now(),
	}
}

func (g *Game) AddPlayer(player *Player) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	var opponent *Player
	var color chess.Color

	if g.WhitePlayer.ID == player.ID {
		g.WhitePlayer = player
		color = chess.White
		opponent = g.BlackPlayer
		g.whiteReady = true
	} else if g.BlackPlayer.ID == player.ID {
		g.BlackPlayer = player
		color = chess.Black
		g.blackReady = true
		opponent = g.WhitePlayer
	} else {
		g.Spectators[player.ID] = player
		color = chess.NoColor
	}

	s1 := ""
	if g.lastMoveS1 != nil {
		s1 = g.lastMoveS1.String()
	}
	s2 := ""
	if g.lastMoveS2 != nil {
		s2 = g.lastMoveS2.String()
	}

	welcomeMessage := WelcomeContextMessage{
		RoomID:          g.ID.String(),
		Player1ID:       g.WhitePlayer.ID.String(),
		Player1Username: g.WhitePlayer.Username,
		Player2ID:       g.BlackPlayer.ID.String(),
		Player2Username: g.BlackPlayer.Username,
		GamePGN:         g.game.String(),
		GameFEN:         g.game.FEN(),
		LastMoveS1:      s1,
		LastMoveS2:      s2,
		GameStatus:      g.Status.String(),
		Winner:          g.Winner,
	}

	jsonData, err := json.Marshal(welcomeMessage)
	if err != nil {
		panic(err)
	}

	res := player.SendMessage(Message{
		Type: "welcome",
		Data: string(jsonData),
	})

	if !res && color == chess.NoColor {
		player.mutex.Lock()
		delete(g.Spectators, player.ID)
		player.mutex.Unlock()
	}

	if color != chess.NoColor && g.whiteReady && g.blackReady && g.Status == WaitingPlayers {
		g.Status = GameOngoing
		startedMsg := Message{
			Type: "game_started",
			Data: "",
		}
		player.SendMessage(startedMsg)
		opponent.SendMessage(startedMsg)
	}
}

func (g *Game) SendMove(player *Player, message PlayerMovedMessage) bool {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	if g.Status != GameOngoing {
		return false
	}

	s1 := convertSquare(message.MoveS1)
	s2 := convertSquare(message.MoveS2)
	if s1 == nil || s2 == nil {
		return false
	}

	var opponent *Player
	var color chess.Color
	switch player.ID {
	case g.WhitePlayer.ID:
		color = chess.White
		opponent = g.BlackPlayer
	case g.BlackPlayer.ID:
		color = chess.Black
		opponent = g.WhitePlayer
	default:
		return false
	}

	turn := g.game.CurrentPosition().Turn()
	if turn != color {
		return false
	}

	for _, move := range g.game.ValidMoves() {
		if move.S1() != *s1 || move.S2() != *s2 {
			continue
		}
		move.NAG()
	}

	move, err := chess.AlgebraicNotation{}.Decode(g.game.Position(), message.MoveNotation)
	if err != nil {
		return false
	}
	if move.S1() != *s1 || move.S2() != *s2 {
		return false
	}

	err = g.game.Move(move, nil)
	if err != nil {
		return false
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		panic(err)
	}

	moveMessage := Message{
		Type: "player_moved",
		Data: string(jsonData),
	}

	outcome := g.game.Outcome()
	if outcome != chess.NoOutcome {
		result := ""
		switch outcome {
		case chess.Draw:
			g.Winner = "draw"
			result = "draw"
		case chess.BlackWon:
			g.Winner = g.BlackPlayer.ID.String()
			result = "black"
		case chess.WhiteWon:
			g.Winner = g.WhitePlayer.ID.String()
			result = "white"
		case chess.UnknownOutcome:
			fmt.Println(g.game.String())
			fmt.Println(g.game.FEN())
			panic("We got an unknown outcome")
		}

		gameEndMessage := GameEndedMessage{
			Winner: g.Winner,
		}
		jsonData, err := json.Marshal(gameEndMessage)
		if err != nil {
			panic(err)
		}
		winMsg := Message{
			Type: "game_ended",
			Data: string(jsonData),
		}

		player.gm.gameRepo.UpdateGame(context.Background(), &models.Game{
			ID:           g.ID,
			WhiteID:      g.WhitePlayer.ID,
			BlackID:      g.BlackPlayer.ID,
			PGN:          g.game.String(),
			LastFEN:      g.game.FEN(),
			Result:       result,
			ResultReason: g.game.Method().String(),
			Status:       "ended",
			StartedAt:    g.StartedAt,
			EndedAt:      time.Now(),
		})

		opponent.SendMessage(moveMessage)
		opponent.SendMessage(winMsg)
		player.SendMessage(winMsg)

		for specID, spec := range g.Spectators {
			ok := false
			if spec != nil {
				ok = spec.SendMessage(moveMessage)
				ok = ok && spec.SendMessage(winMsg)
			}

			if !ok {
				delete(g.Spectators, specID)
			}
		}

		g.Status = GameEnded

		go func() {
			time.Sleep(time.Second)
			g.mutex.Lock()

			gameEndedMessage := Message{
				Type: "quit",
				Data: "Game ended",
			}

			streamGameEndedMsg := matchmaking_grpc.GameEndedEventMsg{
				Pl1: player.ID.String(),
				Pl2: opponent.ID.String(),
			}

			player.gm.StreamChannel <- streamGameEndedMsg

			player.SendMessage(gameEndedMessage)
			opponent.SendMessage(gameEndedMessage)
			for _, spec := range g.Spectators {
				if spec != nil {
					spec.SendMessage(gameEndedMessage)
				}
			}
			toDeleteId := g.ID
			g.mutex.Unlock()

			player.gm.mutex.Lock()
			delete(player.gm.games, toDeleteId)
			player.gm.mutex.Unlock()
			//TODO: save game result in database
		}()
		return true
	}

	opponent.SendMessage(moveMessage)
	for specID, spec := range g.Spectators {
		ok := false
		if spec != nil {
			ok = spec.SendMessage(moveMessage)
		}
		if !ok {
			delete(g.Spectators, specID)
		}
	}

	return true
}

func (g *Game) Resign(player *Player) bool {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	if g.Status != GameOngoing {
		return false
	}

	var opponentColor string
	var opponent *Player
	switch player.ID {
	case g.WhitePlayer.ID:
		opponent = g.BlackPlayer
		opponentColor = "black"
		g.game.Resign(chess.White)
	case g.BlackPlayer.ID:
		opponent = g.WhitePlayer
		opponentColor = "white"
		g.game.Resign(chess.Black)
	default:
		return false
	}

	g.Winner = opponent.ID.String()

	gameEndMessage := GameEndedMessage{
		Winner: g.Winner,
	}
	jsonData, err := json.Marshal(gameEndMessage)
	if err != nil {
		panic(err)
	}
	winMsg := Message{
		Type: "game_ended",
		Data: string(jsonData),
	}

	player.gm.gameRepo.UpdateGame(context.Background(), &models.Game{
		ID:           g.ID,
		WhiteID:      g.WhitePlayer.ID,
		BlackID:      g.BlackPlayer.ID,
		PGN:          g.game.String(),
		LastFEN:      g.game.FEN(),
		Result:       opponentColor,
		ResultReason: "Resignation",
		Status:       "ended",
		StartedAt:    g.StartedAt,
		EndedAt:      time.Now(),
	})

	g.WhitePlayer.SendMessage(winMsg)
	g.BlackPlayer.SendMessage(winMsg)

	for specID, spec := range g.Spectators {
		ok := false
		if spec != nil {
			ok = spec.SendMessage(winMsg)
		}
		if !ok {
			delete(g.Spectators, specID)
		}
	}

	g.Status = GameEnded
	go func() {
		time.Sleep(time.Second)
		g.mutex.Lock()

		gameEndedMessage := Message{
			Type: "quit",
			Data: "Game ended",
		}

		streamGameEndedMsg := matchmaking_grpc.GameEndedEventMsg{
			Pl1: player.ID.String(),
			Pl2: opponent.ID.String(),
		}

		player.gm.StreamChannel <- streamGameEndedMsg

		player.SendMessage(gameEndedMessage)
		opponent.SendMessage(gameEndedMessage)
		for _, spec := range g.Spectators {
			if spec != nil {
				spec.SendMessage(gameEndedMessage)
			}
		}
		toDeleteId := g.ID
		g.mutex.Unlock()

		player.gm.mutex.Lock()
		delete(player.gm.games, toDeleteId)
		player.gm.mutex.Unlock()
		//TODO: save game result in database
	}()
	return true

}
