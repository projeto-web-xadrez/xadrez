package main

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

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
			if len(queue) == 2 {
				c1 := dequeue()
				c2 := dequeue()

			}
		}
	}
}

func main() {
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
