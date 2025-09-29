package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"
	grpc_server "xadrez-game-server/game_server_grpc"

	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all connections
}

type clientObj struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

type Message struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

// É um map de salas
type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

// Contendo o que cada sala possui. Um id montado por client1_client2
// Lista de clientes que estão ali
type Room struct {
	RoomId    string
	clients   map[*Client]bool
	broadcast chan Message
	mu        sync.RWMutex
}

// O channel é utilizado para evitar problemas com concorrencia
type Client struct {
	conn *websocket.Conn
	send chan Message
	room *Room
	id   string
}

// Matchmaker pra gerenciar as salas abertas
var Matchmaker = &Hub{
	rooms: make(map[string]*Room),
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a WebSocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer ws.Close()

	// Fetch query do cliente
	parameters := r.URL.Query()
	clientId := parameters.Get("clientId")
	roomId := parameters.Get("roomId")

	// Cria o cliente

	client := Client{
		conn: ws,
		send: make(chan Message),
		room: Matchmaker.rooms[roomId],
		id:   clientId,
	}

	// Adiciona o cliente na sala
	Matchmaker.rooms[roomId].clients[&client] = true

	for {
		// Read message from browser
		var obj clientObj
		err := ws.ReadJSON(&obj)
		if err != nil {
			//log.fatal (esse lixo encerra o programa)
			return
		}

		switch obj.Type {
		case "tryMove":
			response := map[string]interface{}{
				"type": "moveValidation",
				"from": obj.Data["from"],
				"to":   obj.Data["to"],
			}

			responseBytes, err := json.Marshal(response)
			if err != nil {
				fmt.Printf("error encoding json file %v", err)
				break
			}

			// sem a go routine vamos bloquear a leitura de outras instancias por causa do delay 1, dps acho q da pra tirar
			go func(resp []byte) {
				time.Sleep(1 * time.Second)
				if err := ws.WriteMessage(websocket.TextMessage, responseBytes); err != nil {
					fmt.Println("write error", err)
				}
			}(responseBytes)

			break
		default:
			break
		}
	}
}

type GameServer struct {
	grpc_server.UnimplementedGameServerServer
	//RequestRoom(context.Context, *RequestRoomMessage) (*Room, error)
	//mustEmbedUnimplementedGameServerServer()
}

func (s *GameServer) RequestRoom(ctx context.Context, req *grpc_server.RequestRoomMessage) (*grpc_server.Room, error) {
	fmt.Printf("Room was requested for %s & %s", req.ClientId_1, req.ClientId_2)

	room := Room{
		req.ClientId_1 + "_" + req.ClientId_2 + "_room",
		make(map[*Client]bool),
		make(chan Message),
		sync.RWMutex{},
	}

	// Adiciona a room no matchmaker
	Matchmaker.rooms[req.ClientId_1+"_"+req.ClientId_2+"_room"] = &room

	// Sala criada no grpc
	room2 := grpc_server.Room{
		RoomId: req.ClientId_1 + "_" + req.ClientId_2 + "_room",
	}

	return &room2, nil
}

func main() {
	go func() {
		grpc_listener, err := net.Listen("tcp", "localhost:9191")
		if err != nil {
			panic("Couldn't start GRPC server")
		}

		server := grpc.NewServer()
		grpc_server.RegisterGameServerServer(server, &GameServer{})
		server.Serve(grpc_listener)
	}()

	http.HandleFunc("/ws", handleConnections)

	// Esse websocket vai lidar com os moveValidations
	fmt.Printf("Started listening at 8082\n")
	err := http.ListenAndServe("localhost:8082", nil)
	if err != nil {
		fmt.Printf("Found an error %v", err)
		return
	}

	fmt.Println("Hello world")
}
