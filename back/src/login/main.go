package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"proto-generated/auth_grpc"
	"time"
	"utils"

	"google.golang.org/grpc"
)

var auth_server_grpc auth_grpc.AuthClient

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

type Session struct {
	ClientId   string
	Username   string
	CSRFTToken string
}

type ValidateResponse struct {
	Valid    bool   `json:"valid"`
	Username string `json:"username"`
	ClientId string `json:"clientId"`
}

// Estrutura básica antes de adicionar a db. user -> {Login}
var users = map[string]Login{}

// Estrutura basica para pegar userid e username pela session (tabela session)
var sessions = map[string]Session{}

func sendSession(session *auth_grpc.Session, serverResponse string, w http.ResponseWriter) {
	// seta o token no navegador
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    session.Token,
		Expires:  session.GetExpires().AsTime(),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	final_result := dataObj{
		Type: "result",
		Data: map[string]interface{}{
			"clientId":       session.UserId,
			"username":       session.Username,
			"email":          session.Email,
			"csrfToken":      utils.GenerateCSRFToken(session.Token),
			"serverResponse": serverResponse,
		},
	}

	jsonData, err := json.Marshal(final_result)
	if err != nil {
		http.Error(w, "Error encoding json", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if _, e := w.Write([]byte(jsonData)); e != nil {
		err := http.StatusInternalServerError
		http.Error(w, "Failed to respond to register", err)
	}
}

func login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// throw method not allowed error
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
		return
	}

	email := r.FormValue("email")
	password := r.FormValue("password")
	if email == "" || password == "" {
		http.Error(w, "Missing email or password field", http.StatusBadRequest)
		return
	}

	loginInput := auth_grpc.LoginInput{
		Email:    email,
		Password: password,
	}

	ctx := context.Background()
	userLoggedInMessage, err := auth_server_grpc.Login(ctx, &loginInput)

	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	if !userLoggedInMessage.Res.Ok {
		http.Error(w, userLoggedInMessage.Res.Message, http.StatusConflict)
		return
	}

	sendSession(userLoggedInMessage.Session, "User logged in", w)
}

func register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// throw method not allowed error
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
		return
	}
	// verificar se o usuário ja existe
	email := r.FormValue("email")
	username := r.FormValue("username")
	password := r.FormValue("password")

	// Missing fields
	if email == "" || username == "" || password == "" {
		err := http.StatusExpectationFailed
		http.Error(w, "Missing email, username and password fields", err)
		return
	}

	ctx := context.Background()
	registrationInput := auth_grpc.StartRegistrationInput{
		Username: username,
		Password: password,
		Email:    email,
	}

	verificationPendingMessage, err := auth_server_grpc.StartRegistration(ctx, &registrationInput)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	if !verificationPendingMessage.Res.Ok {
		http.Error(w, verificationPendingMessage.Res.Message, http.StatusConflict)
		return
	}

	final_result := dataObj{
		Type: "result",
		Data: map[string]interface{}{
			"serverResponse":    "Please enter the code sent to your email",
			"verificationToken": verificationPendingMessage.VerificationToken,
		},
	}

	jsonData, err := json.Marshal(final_result)
	if err != nil {
		http.Error(w, "Error encoding json", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if _, e := w.Write([]byte(jsonData)); e != nil {
		err := http.StatusInternalServerError
		http.Error(w, "Failed to respond to register", err)
	}
}

func confirm_registration(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// throw method not allowed error
		err := http.StatusMethodNotAllowed
		http.Error(w, "Invalid Method", err)
		return
	}
	verificationToken := r.FormValue("verificationToken")
	verificationCode := r.FormValue("verificationCode")

	// Missing fields
	if verificationToken == "" || verificationCode == "" {
		http.Error(w, "Missing fields", http.StatusExpectationFailed)
		return
	}

	ctx := context.Background()
	email_verification_input := auth_grpc.EmailVerificationInput{
		OriginIp:          "",
		VerificationToken: verificationToken,
		VerificationCode:  verificationCode,
	}

	userLoggedInMessage, err := auth_server_grpc.ConfirmRegistration(ctx, &email_verification_input)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	if !userLoggedInMessage.Res.Ok {
		http.Error(w, userLoggedInMessage.Res.Message, http.StatusConflict)
		return
	}

	sendSession(userLoggedInMessage.Session, "User registered", w)
}

func logout(w http.ResponseWriter, r *http.Request) {
	sessionCookie, err := r.Cookie("session_token")
	if err == nil {
		sessionToken := sessionCookie.Value
		if _, ok := sessions[sessionToken]; ok {
			delete(sessions, sessionToken)
		}
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
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
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Write([]byte("You accessed the protected route."))
}

func validateUserSession(w http.ResponseWriter, r *http.Request) {
	sessionCookie, err := r.Cookie("session_token")

	if err != nil {
		http.Error(w, "Session token not present", http.StatusUnauthorized)
		return
	}

	csrf := r.Header.Get("X-CSRF-Token")

	if csrf == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	ok := utils.ValidateCSRFToken(csrf, sessionCookie.Value)

	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	ctx := context.Background()
	sessionValidationInput := auth_grpc.SessionValidationInput{
		Token: sessionCookie.Value,
	}
	session, err := auth_server_grpc.ValidateSession(ctx, &sessionValidationInput)
	if err != nil {
		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    "",
			Expires:  time.Now().Add(-time.Hour),
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	if session == nil {
		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    "",
			Expires:  time.Now().Add(-time.Hour),
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	var response = ValidateResponse{
		Valid:    true,
		Username: session.Session.Username,
		ClientId: session.Session.UserId,
	}

	json.NewEncoder(w).Encode(response)
}

var allowedOrigins = map[string]bool{
	"http://localhost:80": true,
	"http://localhost":    true,
	"localhost":           true,
}

// Funcao de teste; retirado daqui: https://www.stackhawk.com/blog/golang-cors-guide-what-it-is-and-how-to-enable-it/#h-what-is-cors
// TODO: permitir apenas requisições que vierem da pagina de login e register??
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token")
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
	conn, err := grpc.NewClient("auth:8989", grpc.WithInsecure())
	if err != nil {
		panic("Couldn't stablish GRPC connection with game-server")
	}
	defer conn.Close()

	auth_server_grpc = auth_grpc.NewAuthClient(conn)

	// mux ~= router
	mux := http.NewServeMux()
	mux.HandleFunc("/login", login)
	mux.HandleFunc("/register", register)
	mux.HandleFunc("/confirm-registration", confirm_registration)
	mux.HandleFunc("/logout", logout)
	mux.HandleFunc("/validate-session", validateUserSession)
	mux.HandleFunc("/protected", protectedRoute)

	handler := corsMiddleware(mux)

	fmt.Println("Login server started listening at 8085")
	http.ListenAndServe("0.0.0.0:8085", handler)
}
