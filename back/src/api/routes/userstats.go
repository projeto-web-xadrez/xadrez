package routes

import (
	"database/repositories"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

var UserRepo *repositories.UserRepo

func routeGetUserStats(w http.ResponseWriter, r *http.Request) {
	fmt.Println("User stats req handler")

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	user, err := UserRepo.GetUserWithStats(r.Context(), id)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	if user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	user.PasswordHash = ""
	user.Email = ""

	jsonData, err := json.Marshal(user)
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
