package routes

import (
	"net/http"
)

func SavedGameRouter(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		routeSavedGamePost(w, r)
	case http.MethodGet:
		routeSavedGameGet(w, r)
	case http.MethodPut:
		routeSavedGamePut(w, r)
	case http.MethodDelete:
		routeSavedGameDelete(w, r)
	default:
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
	}
}

func UserStatsRouter(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		routeUserStatsGet(w, r)
	default:
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
	}
}

func GameRouter(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		routeGameGet(w, r)
	default:
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
	}
}
