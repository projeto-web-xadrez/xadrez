package routes

import (
	"net/http"
)

func SavedGameRouter(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		routePostSavedGame(w, r)
	case http.MethodGet:
		routeGetSavedGame(w, r)
	case http.MethodPut:
		routePutSavedGame(w, r)
	case http.MethodDelete:
		routeDeleteSavedGame(w, r)
	default:
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
	}
}

func UserStatsRouter(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		routeGetUserStats(w, r)
	default:
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
	}
}

func GameRouter(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		routeGetGame(w, r)
	default:
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
	}
}
