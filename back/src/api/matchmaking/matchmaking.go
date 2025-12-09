package matchmaking

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"proto-generated/matchmaking_grpc"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all connections
}

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
	id               uuid.UUID
	ws               *websocket.Conn
	lastPing         time.Time
	lastPingResponse time.Time
}

/*
	MAP com o player e um status: 'idle' apenas conectado na api; 'searching' buscando por uma partida; 'playing' ja esta jogando'
		o jogador deve ser removido do map caso pare de enviar heartbeats ou caso nao confirme a partida caso ela seja encontrada em X tempo
	QUEUE contendo todos os usuarios que requisitaram uma partida
		a queue só deve dar match em dois jogadores que estiverem "searching"; se o status dele é idle, ele pode ser inserido na queue
		caso contrario, significa que ele ja esta na fila (searching) ou ja esta jogando
*/

type MatchmakingManager struct {
	usersMap      map[uuid.UUID]string
	queue         []uuid.UUID
	clients       map[uuid.UUID]*websocket.Conn
	universalLock sync.Mutex
	mmGrpc        matchmaking_grpc.MatchMakingClient
}

func NewMatchmakingManager(mmGrpc matchmaking_grpc.MatchMakingClient, mmEventsStream grpc.ServerStreamingClient[matchmaking_grpc.GameEndedEventMsg]) *MatchmakingManager {
	mm := MatchmakingManager{
		usersMap:      make(map[uuid.UUID]string),          // id -> estado
		queue:         make([]uuid.UUID, 0),                // fila de ids
		clients:       make(map[uuid.UUID]*websocket.Conn), // id -> conexao ws
		universalLock: sync.Mutex{},
		mmGrpc:        mmGrpc,
	}

	go mm.handleStreamMsgs(mmEventsStream)
	go mm.matchmakingLoop()
	return &mm
}

func (mm *MatchmakingManager) handleStreamMsgs(stream grpc.ServerStreamingClient[matchmaking_grpc.GameEndedEventMsg]) {
	for {
		resp, err := stream.Recv()
		if err == io.EOF {
			log.Println("Server stream finished.")
			break
		}
		if err != nil {
			log.Fatalf("error receiving from stream: %v", err)
		}

		p1 := uuid.MustParse(resp.Pl1)
		p2 := uuid.MustParse(resp.Pl2)

		log.Printf("Received game_ended for: %s and %s", resp.Pl1, resp.Pl2)
		mm.universalLock.Lock()
		_, ok := mm.usersMap[p1]
		_, ok2 := mm.usersMap[p2]

		if ok {
			mm.usersMap[p1] = "idle"
		}

		if ok2 {
			mm.usersMap[p2] = "idle"
		}

		mm.universalLock.Unlock()
	}
}

// Usa um unico lock para todo o processo, evita que a go routine seja chamada entre operacoes.
func (mm *MatchmakingManager) safeRegisterMatchRequest(client clientObj) bool {
	mm.universalLock.Lock()
	defer mm.universalLock.Unlock()

	currentState, ok := mm.usersMap[client.id]
	if ok && currentState != "idle" {
		fmt.Println("denied :: " + client.id.String() + " ; he's either already in queue or state not idle, state = " + currentState)
		return false
	}

	fmt.Println("Registering " + client.id.String() + " in queue")
	mm.usersMap[client.id] = "searching"
	mm.clients[client.id] = client.ws
	mm.queue = append(mm.queue, client.id)
	return true
}

func (mm *MatchmakingManager) safeSetUserState(c uuid.UUID, state string) {
	mm.universalLock.Lock()
	defer mm.universalLock.Unlock()

	/* Isto é realmente necessário?
	_, ok := mm.usersMap[c]
	// evita que ele set para idle caso o usuario recarregue a pagina
	if state == "idle" && ok {
		return
	}*/

	mm.usersMap[c] = state
}

func (mm *MatchmakingManager) safeSetClient(id uuid.UUID, ws *websocket.Conn) {
	mm.universalLock.Lock()
	defer mm.universalLock.Unlock()
	mm.clients[id] = ws
}

func (mm *MatchmakingManager) safeGetClient(id uuid.UUID) (*websocket.Conn, bool) {
	mm.universalLock.Lock()
	defer mm.universalLock.Unlock()
	ws, ok := mm.clients[id]
	return ws, ok
}

// executa a funcao de matchmaking periodicamente para encontrar partidas entre dois usuarios
func (mm *MatchmakingManager) matchmakingLoop() {
	for {
		mm.matchmaking()
		time.Sleep(300 * time.Millisecond)
	}
}

func (mm *MatchmakingManager) matchmaking() {
	mm.universalLock.Lock()

	if len(mm.queue) < 2 {
		mm.universalLock.Unlock()
		return
	}

	tempMatch := make([]uuid.UUID, 0, 2)

	for len(tempMatch) < 2 && len(mm.queue) > 0 {
		client := mm.queue[0]
		mm.queue = mm.queue[1:]

		state, exists := mm.usersMap[client]
		if !exists || state != "searching" {
			fmt.Println(`Client with id ` + client.String() + " is already searching!")
			continue
		}

		fmt.Println("added " + client.String() + " to escrow match room")
		tempMatch = append(tempMatch, client)
	}

	if len(tempMatch) < 2 || tempMatch[0] == tempMatch[1] {
		// cria nova fila: tempMatch + queue
		mm.queue = append(mm.queue, tempMatch[0])
		mm.universalLock.Unlock()
		return
	}

	// Tenho 2 jogadores válidos
	player1 := tempMatch[0]
	player2 := tempMatch[1]

	mm.universalLock.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	room, err := mm.mmGrpc.RequestRoom(ctx,
		&matchmaking_grpc.RequestRoomMessage{
			PlayerId_1: player1.String(),
			PlayerId_2: player2.String(),
		})

	if err != nil {
		fmt.Printf("%v\n", err)
		panic("Error acquiring a room")
	}

	if room.ErrorMsg != nil {
		println("Error: ", *room.ErrorMsg)
		return
	}

	mm.safeSetUserState(player1, "playing")
	mm.safeSetUserState(player2, "playing")
	println("Room: " + room.RoomId)

	matchFoundObj := dataObj{
		Type: "matchFound",
		Data: map[string]interface{}{
			"roomId": room.RoomId,
		},
	}

	jsonObj, _ := json.Marshal(matchFoundObj)

	player1_ws, ok1 := mm.safeGetClient(player1)
	player2_ws, ok2 := mm.safeGetClient(player2)

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

func (mm *MatchmakingManager) HandleNewConnection(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a WebSocket
	clientId := r.Context().Value("clientId").(uuid.UUID)
	username := r.Context().Value("username").(string)

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer ws.Close()

	prevClient, ok := mm.safeGetClient(clientId)
	if ok {
		prevClient.Close()
	}

	fmt.Println("Client conectado:", clientId, username)
	mm.safeSetClient(clientId, ws)
	mm.safeSetUserState(clientId, "idle")

	var client clientObj
	client.id = clientId
	client.ws = ws
	client.lastPing = time.Now()
	client.lastPingResponse = time.Now()

	go func() {
		for {
			if client.lastPing.Sub(client.lastPingResponse) > 3*time.Second {
				client.ws.Close()
				conn, ok := mm.safeGetClient(client.id)
				if ok && conn == client.ws {
					mm.safeSetUserState(client.id, "idle")
				}
				break
			}

			time.Sleep(time.Second)
			pingMessage, _ := json.Marshal(dataObj{
				Type: "ping",
				Data: map[string]interface{}{},
			})
			err := client.ws.WriteMessage(websocket.TextMessage, pingMessage)
			if err != nil {
				conn, ok := mm.safeGetClient(client.id)
				if ok && conn == client.ws {
					mm.safeSetUserState(client.id, "idle")
				}
				break
			}
			client.lastPing = time.Now()
		}
	}()

	for {
		// Read message from browser
		var obj dataObj
		err := ws.ReadJSON(&obj)
		if err != nil {
			conn, ok := mm.safeGetClient(client.id)
			if ok && conn == client.ws {
				mm.safeSetUserState(client.id, "idle")
			}
			return
		}

		if obj.Type == "joinQueue" {
			fmt.Println("Processing " + client.id.String() + " request")
			mm.safeRegisterMatchRequest(client)
		}

		if obj.Type == "leaveQueue" {
			fmt.Println("Setting " + client.id.String() + "as idle since the user requested cancel")
			mm.safeSetUserState(client.id, "idle")
		}

		if obj.Type == "ping" {
			client.lastPingResponse = time.Now()
		}
	}
}
