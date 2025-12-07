package routes

import (
	"database/models"
	"database/repositories"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/google/uuid"
)

type GamePGNStruct struct {
	PGN  string `json:"pgn"`
	Name string `json:"name"`
}

var SavedRepo *repositories.SavedGameRepo

func ManageGame(w http.ResponseWriter, r *http.Request) {
	clientId := r.Context().Value("clientId").(string)
	user_uuid, err := uuid.Parse(clientId)

	if err != nil {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}
	switch r.Method {
	case http.MethodPost:
		//create-game
		var GamePGNMsg GamePGNStruct
		decoder := json.NewDecoder(r.Body)

		err := decoder.Decode(&GamePGNMsg)

		if err != nil {
			http.Error(w, "Internal Error", http.StatusInternalServerError)
			break
		}

		// validacao do PGN
		reader := strings.NewReader(GamePGNMsg.PGN)
		pgn, err := chess.PGN(reader)
		if err != nil {
			println("PGN: " + GamePGNMsg.PGN)
			http.Error(w, "PGN is invalid", http.StatusInternalServerError)
			break
		}
		newG := chess.NewGame(pgn)
		last_fen := newG.FEN()

		_, err = SavedRepo.CreateNewGame(r.Context(), user_uuid, GamePGNMsg.Name, GamePGNMsg.PGN, last_fen)

		if err != nil {
			println(err)
			http.Error(w, "Failed to create game", http.StatusInternalServerError)
			break
		}

		// retorna todos os jogos atualizados do usuario para atualizar no frontend

		savedGames, err := SavedRepo.GetGamesFromUser(r.Context(), user_uuid, 100)
		if err != nil {
			http.Error(w, "Failed to fetch games", http.StatusInternalServerError)
			break
		}

		jsonData, err := json.Marshal(savedGames)

		if _, e := w.Write([]byte(jsonData)); e != nil {
			err := http.StatusInternalServerError
			http.Error(w, "Failed to respond to create games request", err)
		}
		break

	case http.MethodGet:
		id := r.PathValue("id")

		if id == "" {
			// fetch-all-games

			savedGames, err := SavedRepo.GetGamesFromUser(r.Context(), user_uuid, 100)
			if err != nil {
				http.Error(w, "Failed to fetch games", http.StatusInternalServerError)
				break
			}

			jsonData, err := json.Marshal(savedGames)

			if _, e := w.Write([]byte(jsonData)); e != nil {
				err := http.StatusInternalServerError
				http.Error(w, "Failed to respond to fetch games request", err)
			}
			break
		}

		//fetch-game
		game_id, err := uuid.Parse(id)

		if err != nil {
			http.Error(w, "Internal error", http.StatusInternalServerError)
			break
		}

		savedGames, err := SavedRepo.GetGame(r.Context(), game_id)
		if err != nil {
			println(err)
			http.Error(w, "Failed to fetch games", http.StatusInternalServerError)
			break
		}

		jsonData, err := json.Marshal(savedGames)

		if _, e := w.Write([]byte(jsonData)); e != nil {
			err := http.StatusInternalServerError
			http.Error(w, "Failed to respond to create game request", err)
		}

		break
	case http.MethodPut:
		//edit-game
		id := r.PathValue("id")

		if id == "" {
			http.Error(w, "Invalid game id", http.StatusInternalServerError)
			break
		}

		var GamePGNMsg GamePGNStruct
		decoder := json.NewDecoder(r.Body)

		err := decoder.Decode(&GamePGNMsg)

		if err != nil {
			http.Error(w, "Internal Error", http.StatusInternalServerError)
			break
		}
		reader := strings.NewReader(GamePGNMsg.PGN)
		pgn, err := chess.PGN(reader)
		if err != nil {
			http.Error(w, "PGN is invalid", http.StatusInternalServerError)
			break
		}
		newG := chess.NewGame(pgn)
		last_fen := newG.FEN()

		gameId_uuid, err := uuid.Parse(id)

		if err != nil {
			http.Error(w, "Internal Error", http.StatusInternalServerError)
			break
		}

		gameModel := models.SavedGame{
			ID:        gameId_uuid,
			UserID:    user_uuid,
			Name:      GamePGNMsg.Name,
			PGN:       GamePGNMsg.PGN,
			LastFEN:   last_fen,
			CreatedAt: time.Now(),
		}
		err = SavedRepo.UpdateGame(r.Context(), &gameModel)

		if err != nil {
			http.Error(w, "Internal Error", http.StatusInternalServerError)
			break
		}

		if _, e := w.Write([]byte("")); e != nil {
			err := http.StatusInternalServerError
			http.Error(w, "Failed to respond to edit game request", err)
		}
		break

	case http.MethodDelete:
		// del-game
		id := r.PathValue("id")

		if id == "" {
			http.Error(w, "Invalid game id", http.StatusInternalServerError)
			break
		}

		gameId_uuid, err := uuid.Parse(id)

		if err != nil {
			http.Error(w, "Internal Error", http.StatusInternalServerError)
			break
		}

		_, err = SavedRepo.DeleteGameFromUser(r.Context(), gameId_uuid, user_uuid)
		if err != nil {
			http.Error(w, "Internal Error", http.StatusInternalServerError)
			break
		}

		// envia a lista completa de jogos atualizados

		savedGames, err := SavedRepo.GetGamesFromUser(r.Context(), user_uuid, 100)
		if err != nil {
			http.Error(w, "Failed to delete games", http.StatusInternalServerError)
			break
		}

		jsonData, err := json.Marshal(savedGames)

		if _, e := w.Write([]byte(jsonData)); e != nil {
			err := http.StatusInternalServerError
			http.Error(w, "Failed to respond to delete games request", err)
		}
		break

	default:
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
		break
	}
}
