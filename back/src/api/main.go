package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"proto-generated/internalgrpc"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"google.golang.org/grpc"
)

var internal_grpc_conn internalgrpc.InternalClient

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all connections
}

type dataObj struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

type clientObj struct {
	id string
	ws *websocket.Conn
}

var queue = make([]clientObj, 0)

func enqueue(element clientObj) {
	queue = append(queue, element) // Simply append to enqueue.
	fmt.Println("Enqueued:", element)
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
	fmt.Println("Client conectado")
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
			var client clientObj
			// TODO: olhar como fazer isso aqui direito kkkk
			client.id = obj.Data["id"].(string)
			client.ws = ws

			enqueue(client)

			if len(queue) >= 2 {
				ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
				defer cancel()

				var client1 clientObj
				client1 = dequeue()

				var client2 clientObj
				client2 = dequeue()

				room, err := internal_grpc_conn.RequestRoom(ctx,
					&internalgrpc.RequestRoomMessage{
						PlayerId_1: client1.id,
						PlayerId_2: client2.id,
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

				if err := client1.ws.WriteMessage(websocket.TextMessage, jsonObj); err != nil {
					fmt.Println("Falha ao enviar a sala para o client1")
				}

				if err := client2.ws.WriteMessage(websocket.TextMessage, jsonObj); err != nil {
					fmt.Println("Falha ao enviar a sala para o client1")
				}
			}

		}
	}
}

func testing() {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	room, err := internal_grpc_conn.RequestRoom(ctx,
		&internalgrpc.RequestRoomMessage{
			PlayerId_1: "CLIENT 1",
			PlayerId_2: "CLIENT 2",
		})

	if err != nil {
		fmt.Printf("%v", err)
		panic("Error acquiring a room")
	}

	if room.ErrorMsg != nil {
		println("Error: ", *room.ErrorMsg)
		return
	}

	println("Room: " + room.RoomId)
}

func main() {
	conn, err := grpc.NewClient("gameserver:9191", grpc.WithInsecure())
	if err != nil {
		panic("Couldn't stablish GRPC connection with game-server")
	}

	defer conn.Close()
	internal_grpc_conn = internalgrpc.NewInternalClient(conn)

	//testing()

	var Wg sync.WaitGroup
	Wg.Add(1)

	server_ws := http.NewServeMux()
	server_ws.HandleFunc("/ws", handleConnections)

	go func() {
		defer Wg.Done()
		fmt.Println("WebSocket server started on :8080")
		err := http.ListenAndServe("0.0.0.0:8080", server_ws)
		if err != nil {
			fmt.Println("ListenAndServe:", err)
		}
	}()

	// bloqueia o fim da thread principal até que os dois sejam terminados.
	Wg.Wait()

}
