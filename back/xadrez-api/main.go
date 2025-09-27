package main

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"
	grpc_server "xadrez-api/game_server_grpc"

	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
)

var grpc_game_server_conn grpc_server.GameServerClient

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all connections
}

type dataObj struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

type clientObj struct {
	id string
}

var queue = make([]clientObj, 0)

func enqueue(element clientObj) {
	queue = append(queue, element) // Simply append to enqueue.
	fmt.Println("Enqueued:", element)
	return
}

func dequeue() clientObj {
	element := queue[0] // The first element is the one to be dequeued.
	queue = queue[1:]
	if len(queue) == 1 {
		return element

	}

	return element // Slice off the element once it is dequeued.
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a WebSocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer ws.Close()

	for {
		// Read message from browser
		var obj dataObj
		err := ws.ReadJSON(&obj)
		if err != nil {
			//log.fatal (esse lixo encerra o programa)
			return
		}

		if obj.Type == "requestMatch" {
			var client clientObj
			// TODO: olhar como fazer isso aqui direito kkkk
			client.id = obj.Data["id"].(string)
			enqueue(client)

			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()

			room, err := grpc_game_server_conn.RequestRoom(ctx,
				&grpc_server.RequestRoomMessage{
					ClientId_1: dequeue().id,
					ClientId_2: dequeue().id,
				})

			if err != nil {
				panic("Error acquiring a room")
			}

			w.Write([]byte(room.RoomId))
		}
	}
}

func testing() {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	room, err := grpc_game_server_conn.RequestRoom(ctx,
		&grpc_server.RequestRoomMessage{
			ClientId_1: "CLIENT 1",
			ClientId_2: "CLIENT 2",
		})

	if err != nil {
		panic("Error acquiring a room")
	}

	println("Room: " + room.RoomId)
}

func main() {

	conn, err := grpc.NewClient("localhost:9191", grpc.WithInsecure())
	if err != nil {
		panic("Couldn't stablish GRPC connection with game-server")
	}

	defer conn.Close()
	grpc_game_server_conn = grpc_server.NewGameServerClient(conn)

	testing()

	var Wg sync.WaitGroup
	Wg.Add(1)

	server_ws := http.NewServeMux()
	server_ws.HandleFunc("/ws", handleConnections)

	go func() {
		defer Wg.Done()
		fmt.Println("WebSocket server started on :8080")
		err := http.ListenAndServe("localhost:8080", server_ws)
		if err != nil {
			fmt.Println("ListenAndServe:", err)
		}
	}()

	// bloqueia o fim da thread principal até que os dois sejam terminados.
	Wg.Wait()

}
