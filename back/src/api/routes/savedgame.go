package routes

import (
	"database/models"
	"database/repositories"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/google/uuid"
)

var SavedGamesRepo *repositories.SavedGameRepo

type gamePGNStruct struct {
	PGN  string `json:"pgn"`
	Name string `json:"name"`
}

func routeGetSavedGame(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	clientID := r.Context().Value("clientId").(uuid.UUID)

	if id == "" {
		// fetch-all-games

		savedGames, err := SavedGamesRepo.GetGamesFromUser(r.Context(), clientID, 100)
		if err != nil {
			http.Error(w, "Failed to fetch games", http.StatusInternalServerError)
			return
		}

		jsonData, err := json.Marshal(savedGames)

		if _, e := w.Write([]byte(jsonData)); e != nil {
			err := http.StatusInternalServerError
			http.Error(w, "Failed to respond to fetch games request", err)
		}
		return
	}

	//fetch-game
	game_id, err := uuid.Parse(id)

	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	savedGames, err := SavedGamesRepo.GetGame(r.Context(), game_id)
	if err != nil {
		http.Error(w, "Failed to fetch games", http.StatusInternalServerError)
		return
	}

	jsonData, err := json.Marshal(savedGames)

	if _, e := w.Write([]byte(jsonData)); e != nil {
		err := http.StatusInternalServerError
		http.Error(w, "Failed to respond to create game request", err)
	}
}

func routePostSavedGame(w http.ResponseWriter, r *http.Request) {
	clientID := r.Context().Value("clientId").(uuid.UUID)
	var GamePGNMsgArr []gamePGNStruct
	var GamePGNMsg gamePGNStruct

	data, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}

	err = json.Unmarshal([]byte(data), &GamePGNMsg)
	if err != nil {
		err = json.Unmarshal([]byte(data), &GamePGNMsgArr)
		if err != nil {
			http.Error(w, "Internal Error", http.StatusInternalServerError)
			return
		}
	} else {
		GamePGNMsgArr = make([]gamePGNStruct, 1)
		GamePGNMsgArr[0] = GamePGNMsg
	}

	if len(GamePGNMsgArr) == 0 {
		http.Error(w, "Empty games array", http.StatusInternalServerError)
		return
	}
	if len(GamePGNMsgArr) > 20 {
		http.Error(w, "Too many games", http.StatusInternalServerError)
		return
	}

	someOk := false
	errorMessage := ""
	for _, msg := range GamePGNMsgArr {
		// validacao do PGN
		reader := strings.NewReader(msg.PGN)
		pgn, err := chess.PGN(reader)
		if err != nil {
			errorMessage = "PGN is invalid"
			continue
		}
		newG := chess.NewGame(pgn)
		last_fen := newG.FEN()

		_, err = SavedGamesRepo.CreateNewGame(r.Context(), clientID, msg.Name, msg.PGN, last_fen)

		if err != nil {
			errorMessage = "Failed to create game"
			continue
		}

		someOk = true
	}

	if !someOk {
		http.Error(w, errorMessage, http.StatusInternalServerError)
		return
	}

	// retorna todos os jogos atualizados do usuario para atualizar no frontend

	savedGames, err := SavedGamesRepo.GetGamesFromUser(r.Context(), clientID, 100)
	if err != nil {
		http.Error(w, "Failed to fetch games", http.StatusInternalServerError)
		return
	}

	jsonData, _ := json.Marshal(savedGames)

	if _, e := w.Write([]byte(jsonData)); e != nil {
		err := http.StatusInternalServerError
		http.Error(w, "Failed to respond to create games request", err)
	}
}

func routePutSavedGame(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	clientID := r.Context().Value("clientId").(uuid.UUID)

	if id == "" {
		http.Error(w, "Invalid game id", http.StatusInternalServerError)
		return
	}

	var GamePGNMsg gamePGNStruct
	decoder := json.NewDecoder(r.Body)

	err := decoder.Decode(&GamePGNMsg)

	if err != nil {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}
	reader := strings.NewReader(GamePGNMsg.PGN)
	pgn, err := chess.PGN(reader)
	if err != nil {
		http.Error(w, "PGN is invalid", http.StatusInternalServerError)
		return
	}
	newG := chess.NewGame(pgn)
	last_fen := newG.FEN()

	gameId_uuid, err := uuid.Parse(id)

	if err != nil {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}

	gameModel := models.SavedGame{
		ID:        gameId_uuid,
		UserID:    clientID,
		Name:      GamePGNMsg.Name,
		PGN:       GamePGNMsg.PGN,
		LastFEN:   last_fen,
		CreatedAt: time.Now(),
	}
	err = SavedGamesRepo.UpdateGame(r.Context(), &gameModel)

	if err != nil {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}

	savedGames, err := SavedGamesRepo.GetGamesFromUser(r.Context(), clientID, 100)
	if err != nil {
		http.Error(w, "Failed to delete games", http.StatusInternalServerError)
		return
	}

	jsonData, err := json.Marshal(savedGames)

	if _, e := w.Write([]byte(jsonData)); e != nil {
		err := http.StatusInternalServerError
		http.Error(w, "Failed to respond to update games request", err)
	}
}

func routeDeleteSavedGame(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	clientID := r.Context().Value("clientId").(uuid.UUID)

	if id == "" {
		http.Error(w, "Invalid game id", http.StatusInternalServerError)
		return
	}

	gameId_uuid, err := uuid.Parse(id)

	if err != nil {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}

	_, err = SavedGamesRepo.DeleteGameFromUser(r.Context(), gameId_uuid, clientID)
	if err != nil {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}

	// envia a lista completa de jogos atualizados

	savedGames, err := SavedGamesRepo.GetGamesFromUser(r.Context(), clientID, 100)
	if err != nil {
		http.Error(w, "Failed to delete games", http.StatusInternalServerError)
		return
	}

	jsonData, err := json.Marshal(savedGames)

	if _, e := w.Write([]byte(jsonData)); e != nil {
		err := http.StatusInternalServerError
		http.Error(w, "Failed to respond to delete games request", err)
	}
}
