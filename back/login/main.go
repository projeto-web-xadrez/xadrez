package main

import (
	"fmt"
	"net/http"
	"time"
)

// NAO PRECISAMOS IMPORTAR MANUALMENTE SE OS ARQUIVOS ESTIVEREM NO MESMO DIRETÓRIO
// E COM O MESMO PACKAGE NO TOPO

type Login struct {
	HashedPassword string
	Token          string
	CSRFTToken     string
}

// Estrutura básica antes de adicionar a db. user -> {Login}
var users = map[string]Login{}

func login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// throw method not allowed error
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
		return
	}
	// verificar se o usuário está registrado
	username := r.FormValue("username")
	if _, ok := users[username]; !ok {
		err := http.StatusConflict
		http.Error(w, "User is not registered", err)
		return
	}
	password := r.FormValue("password")
	current_user := users[username]
	hashedPass := current_user.HashedPassword

	// Cria o token
	if result := compPass(password, hashedPass); result {
		fmt.Printf("User logged in successfully")
		token := genToken(32)
		csrfToken := genToken(32)

		current_user.Token = token
		current_user.CSRFTToken = csrfToken
		users[username] = current_user

		// seta o token no navegador
		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    token,
			Expires:  time.Now().Add(24 * time.Hour),
			HttpOnly: true,
		})

		http.SetCookie(w, &http.Cookie{
			Name:     "csrf_token",
			Value:    csrfToken,
			Expires:  time.Now().Add(24 * time.Hour),
			HttpOnly: false, // garante que só aquele site vai conseguir ler e enviar o token no header
		})

		if _, e := w.Write([]byte("User logged in")); e != nil {
			err := http.StatusInternalServerError
			http.Error(w, "Failed to respond to login", err)
		}
	} else {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	}

}

func register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// throw method not allowed error
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
		return
	}
	// verificar se o usuário ja existe
	username := r.FormValue("username")
	if _, ok := users[username]; ok {
		err := http.StatusConflict
		http.Error(w, "User already registered", err)
		return
	}
	password := r.FormValue("password")
	if result, err := hashPass(password); err == nil {
		users[username] = Login{
			HashedPassword: result,
		}

		fmt.Printf("User registered successfully")
		if _, e := w.Write([]byte("User registered")); e != nil {
			err := http.StatusInternalServerError
			http.Error(w, "Failed to respond to register", err)
		}
	}

}

func logout(w http.ResponseWriter, r *http.Request) {
	if err := Authorize(r); err != nil {
		fmt.Print(err.Error())
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		HttpOnly: true,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		HttpOnly: false,
	})

	username := r.FormValue("username")
	current_user := users[username]
	current_user.CSRFTToken = ""
	current_user.Token = ""
	users[username] = current_user
}

func main() {
	http.HandleFunc("/login", login)
	http.HandleFunc("/register", register)
	http.HandleFunc("/logout", logout)
	http.ListenAndServe("localhost:8085", nil)
}
