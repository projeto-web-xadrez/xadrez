package routes

import (
	"net/http"
)

type GamePGNStruct struct {
	PGN  string `json:"pgn"`
	Name string `json:"name"`
}

func ManageSavedGame(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		manageSavedGamePost(w, r)
	case http.MethodGet:
		manageSavedGameGet(w, r)
	case http.MethodPut:
		manageSavedGamePut(w, r)
	case http.MethodDelete:
		manageSavedGameDelete(w, r)
	default:
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
	}
}
