package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// NAO PRECISAMOS IMPORTAR MANUALMENTE SE OS ARQUIVOS ESTIVEREM NO MESMO DIRETÓRIO
// E COM O MESMO PACKAGE NO TOPO

type dataObj struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

type Login struct {
	HashedPassword string
	Token          string
	CSRFTToken     string
	ClientId       string
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
		fmt.Println("User logged in successfully")
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

		var result dataObj
		result.Type = "result"
		result.Data = make(map[string]interface{})
		result.Data["clientId"] = current_user.ClientId
		result.Data["serverResponse"] = "Successfully logged in"

		jsonData, _ := json.Marshal(result)

		w.Header().Set("Content-Type", "application/json")

		if _, e := w.Write([]byte(jsonData)); e != nil {
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
	result, err := hashPass(password)

	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	users[username] = Login{
		HashedPassword: result,
	}

	fmt.Println("User registered successfully")

	token := genToken(32)
	csrfToken := genToken(32)
	clientId := genToken(16)

	current_user := users[username]
	current_user.Token = token
	current_user.CSRFTToken = csrfToken
	current_user.ClientId = clientId
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

	var final_result dataObj
	final_result.Type = "result"
	final_result.Data = make(map[string]interface{})
	final_result.Data["clientId"] = clientId
	final_result.Data["serverResponse"] = "User registered"

	jsonData, _ := json.Marshal(final_result)

	w.Header().Set("Content-Type", "application/json")

	if _, e := w.Write([]byte(jsonData)); e != nil {
		err := http.StatusInternalServerError
		http.Error(w, "Failed to respond to register", err)
	}
}

func logout(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	if user, ok := users[username]; ok {
		user.CSRFTToken = ""
		user.Token = ""
		users[username] = user
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
	fmt.Println("Logout completed successfully")
}

func protectedRoute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// throw method not allowed error
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
		return
	}

	if err := Authorize(r); err != nil {
		fmt.Println(err.Error())
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Write([]byte("You accessed the protected route."))
}

var allowedOrigins = map[string]bool{
	"http://localhost:3000": true,
	"http://localhost:3001": true,
}

// Funcao de teste; retirado daqui: https://www.stackhawk.com/blog/golang-cors-guide-what-it-is-and-how-to-enable-it/#h-what-is-cors
// TODO: permitir apenas requisições que vierem da pagina de login e register??
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}
		/* w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		// credentials para o client aceitar os cookies
		w.Header().Set("Access-Control-Allow-Credentials", "true") */
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	// mux ~= router
	mux := http.NewServeMux()
	mux.HandleFunc("/login", login)
	mux.HandleFunc("/register", register)
	mux.HandleFunc("/logout", logout)
	mux.HandleFunc("/protected", protectedRoute)

	handler := corsMiddleware(mux)

	fmt.Println("Login server started listening at 8085")
	http.ListenAndServe("0.0.0.0:8085", handler)
}
