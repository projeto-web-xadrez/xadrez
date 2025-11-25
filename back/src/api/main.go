package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"proto-generated/matchmaking_grpc"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
)

var matchmaking_grpc_conn matchmaking_grpc.MatchMakingClient

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all connections
}

/*
	MAP com o player e um status: 'idle' apenas conectado na api; 'searching' buscando por uma partida; 'playing' ja esta jogando'
		o jogador deve ser removido do map caso pare de enviar heartbeats ou caso nao confirme a partida caso ela seja encontrada em X tempo
	QUEUE contendo todos os usuarios que requisitaram uma partida
		a queue só deve dar match em dois jogadores que estiverem "searching"; se o status dele é idle, ele pode ser inserido na queue
		caso contrario, significa que ele ja esta na fila (searching) ou ja esta jogando


*/

type ctxKey string

var (
	ctxKeyClientId = ctxKey("clientId")
	ctxKeyUsername = ctxKey("username")
)

type dataObj struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

type ValidateResponse struct {
	Valid    bool   `json:"valid"`
	Username string `json:"username"`
	ClientId string `json:"clientId"`
}

type clientObj struct {
	id string
	ws *websocket.Conn
}

var usersMap = make(map[string]string)         // id -> estado
var queue = make([]string, 0)                  // fila de ids
var clients = make(map[string]*websocket.Conn) // id -> conexao ws
var universalLock sync.Mutex

// Usa um unico lock para todo o processo, evita que a go routine seja chamada entre operacoes.
func safeRegisterMatchRequest(client clientObj) bool {
	universalLock.Lock()
	defer universalLock.Unlock()

	currentState, ok := usersMap[client.id]
	if ok && currentState != "idle" {
		fmt.Println("denied :: " + client.id + " ; he's either already in queue or state not idle")
		return false
	}

	fmt.Println("Registering " + client.id + " in queue")
	usersMap[client.id] = "searching"
	clients[client.id] = client.ws
	queue = append(queue, client.id)
	return true
}

func safeEnqueue(c string) {
	universalLock.Lock()
	defer universalLock.Unlock()
	queue = append(queue, c)
}

func safeDequeue() (string, bool) {
	universalLock.Lock()
	defer universalLock.Unlock()

	if len(queue) == 0 {
		return "", false
	}

	elem := queue[0]
	queue = queue[1:]
	return elem, true
}

func safeGetUserState(c string) (string, bool) {
	universalLock.Lock()
	defer universalLock.Unlock()
	val, ok := usersMap[c]
	return val, ok
}

func safeSetUserState(c string, state string) {
	universalLock.Lock()
	defer universalLock.Unlock()
	usersMap[c] = state
}

func safeSetClient(id string, ws *websocket.Conn) {
	universalLock.Lock()
	defer universalLock.Unlock()
	clients[id] = ws
}

func safeGetClient(id string) (*websocket.Conn, bool) {
	universalLock.Lock()
	defer universalLock.Unlock()
	ws, ok := clients[id]
	return ws, ok
}

// executa a funcao de matchmaking periodicamente para encontrar partidas entre dois usuarios
func matchmakingLoop() {
	for {
		matchmaking()
		time.Sleep(300 * time.Millisecond)
	}
}

func matchmaking() {
	universalLock.Lock()

	if len(queue) < 2 {
		universalLock.Unlock()
		return
	}

	tempMatch := make([]string, 0, 2)

	for len(tempMatch) < 2 && len(queue) > 0 {
		client := queue[0]
		queue = queue[1:]

		state, exists := usersMap[client]
		if !exists || state != "searching" {
			fmt.Println(`Client with id ` + client + " is already searching!")
			continue
		}

		fmt.Println("added " + client + " to escrow match room")
		tempMatch = append(tempMatch, client)
	}

	if len(tempMatch) < 2 {
		// cria nova fila: tempMatch + queue
		queue = append(tempMatch, queue...)
		universalLock.Unlock()
		return
	}

	// Tenho 2 jogadores válidos
	player1 := tempMatch[0]
	player2 := tempMatch[1]

	universalLock.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	room, err := internal_grpc_conn.RequestRoom(ctx,
		&internalgrpc.RequestRoomMessage{
			PlayerId_1: player1,
			PlayerId_2: player2,
		})

	if err != nil {
		fmt.Printf("%v\n", err)
		panic("Error acquiring a room")
	}

	if room.ErrorMsg != nil {
		println("Error: ", *room.ErrorMsg)
		return
	}

	println("Room: " + room.RoomId)

	matchFoundObj := dataObj{
		Type: "matchFound",
		Data: map[string]interface{}{
			"roomId": room.RoomId,
		},
	}

	jsonObj, _ := json.Marshal(matchFoundObj)

	player1_ws, ok1 := safeGetClient(player1)
	player2_ws, ok2 := safeGetClient(player2)

	// TODO: enviar uma mensagem aos jogadores ou algo do tipo
	if !ok1 || !ok2 {
		fmt.Println("Falha ao recuperar cliente (ws) dos jogadores")
		return
	}

	if err := player1_ws.WriteMessage(websocket.TextMessage, jsonObj); err != nil {
		fmt.Println("Falha ao enviar a sala para o player1")
	}

	if err := player2_ws.WriteMessage(websocket.TextMessage, jsonObj); err != nil {
		fmt.Println("Falha ao enviar a sala para o player1")
	}

}

func ValidateWithLoginServer(r *http.Request) (*ValidateResponse, error) {
	req, _ := http.NewRequest("POST", "http://login:8085/validate-session", nil)

	// repassar cookies
	for _, c := range r.Cookies() {
		req.AddCookie(c)
	}

	// repassar header de csrf
	//req.Header.Set("X-CSRF-Token", r.Header.Get("X-CSRF-Token"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unauthorized")
	}

	var data ValidateResponse
	json.NewDecoder(resp.Body).Decode(&data)

	return &data, nil
}

// autentica o usuario via http e depois permite que a conexao receba o upgrade para websocket
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userData, err := ValidateWithLoginServer(r)

		if err != nil {
			fmt.Println("Client session was not valid")
			http.SetCookie(w, &http.Cookie{
				Name:     "session_token",
				Value:    "",
				Expires:  time.Now().Add(-time.Hour),
				HttpOnly: true,
				Path:     "/",
				SameSite: http.SameSiteLaxMode,
			})

			http.SetCookie(w, &http.Cookie{
				Name:     "csrf_token",
				Value:    "",
				Expires:  time.Now().Add(-time.Hour),
				HttpOnly: false,
				Path:     "/",
				SameSite: http.SameSiteLaxMode,
			})
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := r.Context()
		ctx = context.WithValue(ctx, ctxKeyClientId, userData.ClientId)
		ctx = context.WithValue(ctx, ctxKeyUsername, userData.Username)

		next(w, r.WithContext(ctx))
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a WebSocket

	clientId := r.Context().Value(ctxKeyClientId).(string)
	username := r.Context().Value(ctxKeyUsername).(string)

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer ws.Close()

	fmt.Println("Client conectado:", clientId, username)
	safeSetClient(clientId, ws)
	safeSetUserState(clientId, "idle")

	var client clientObj
	client.id = clientId
	client.ws = ws

	for {
		// Read message from browser
		var obj dataObj
		err := ws.ReadJSON(&obj)
		if err != nil {
			fmt.Println(err)
			//log.fatal (esse lixo encerra o programa)
			return
		}

		if obj.Type == "requestMatch" {
			fmt.Println("Processing " + client.id + " request")
			safeRegisterMatchRequest(client)

		}
	}
}

func main() {
	// Inicia conexão gRPC
	conn, err := grpc.NewClient("gameserver:9191", grpc.WithInsecure())
	if err != nil {
		panic("Couldn't stablish GRPC connection with game-server")
	}
	defer conn.Close()

	internal_grpc_conn = internalgrpc.NewInternalClient(conn)

	// WaitGroup apenas para o servidor WebSocket
	var wg sync.WaitGroup
	wg.Add(1)

	server_ws := http.NewServeMux()
	server_ws.HandleFunc("/ws", authMiddleware(handleConnections))

	// Goroutine do WebSocket server
	go func() {
		defer wg.Done()
		fmt.Println("WebSocket server started on :8080")
		if err := http.ListenAndServe("0.0.0.0:8080", server_ws); err != nil {
			fmt.Println("ListenAndServe:", err)
		}
	}()

	// Goroutine contínua do matchmaking
	go matchmakingLoop()

	// Mantém a main viva enquanto o servidor WebSocket estiver rodando
	wg.Wait()
}
