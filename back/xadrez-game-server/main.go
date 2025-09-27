package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
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

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a WebSocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer ws.Close()

	//ws.WriteMessage(websocket.TextMessage, []byte("Olá mundo"))

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
	room := grpc_server.Room{
		RoomId: req.ClientId_1 + "_" + req.ClientId_2 + "_room",
	}

	return &room, nil
}

func main() {
	go func() {
		grpc_listener, err := net.Listen("tcp", ":9191")
		if err != nil {
			panic("Couldn't start GRPC server")
		}

		server := grpc.NewServer()
		grpc_server.RegisterGameServerServer(server, &GameServer{})
		server.Serve(grpc_listener)
	}()

	http.HandleFunc("/ws", handleConnections)

	fmt.Printf("Started listening at 8082")
	err := http.ListenAndServe("localhost:8082", nil)
	if err != nil {
		fmt.Printf("Found an error %v", err)
		return
	}

	fmt.Println("Hello world")
}
