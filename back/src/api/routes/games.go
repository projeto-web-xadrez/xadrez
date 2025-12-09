package routes

import (
	"database/repositories"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
)

var GameRepo *repositories.GameRepo

func routeGetGame(w http.ResponseWriter, r *http.Request) {
	gameID, err := uuid.Parse(r.PathValue("id"))

	if err == nil {
		game, err := GameRepo.GetGame(r.Context(), gameID)
		if err != nil {
			http.Error(w, "Internal error", http.StatusInternalServerError)
			return
		}
		if game == nil {
			http.Error(w, "Game not found", http.StatusNotFound)
			return
		}

		jsonData, err := json.Marshal(game)
		if err != nil {
			http.Error(w, "Internal error", http.StatusInternalServerError)
			return
		}

		_, err = w.Write([]byte(jsonData))
		if err != nil {
			http.Error(w, "Internal error", http.StatusInternalServerError)
		}
		return
	}

	userID, err := uuid.Parse(r.URL.Query().Get("user"))
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	games, err := GameRepo.GetGamesFromUser(r.Context(), userID, 100)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	jsonData, err := json.Marshal(games)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	_, err = w.Write([]byte(jsonData))
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
}
