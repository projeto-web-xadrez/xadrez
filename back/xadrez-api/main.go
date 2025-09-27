package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all connections
}

type clientObj struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

func handleRawHttpConnections(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Received a request on /req")
	io.WriteString(w, "what's up")
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

func main() {
	var Wg sync.WaitGroup
	Wg.Add(2)

	server_ws := http.NewServeMux()
	server_http := http.NewServeMux()

	server_ws.HandleFunc("/ws", handleConnections)
	server_http.HandleFunc("/req", handleRawHttpConnections)

	// se colocar só :8080 ele fica pedindo permissao ao firewall
	go func() {
		defer Wg.Done()
		fmt.Println("WebSocket server started on :8080")
		err := http.ListenAndServe("localhost:8080", server_ws)
		if err != nil {
			fmt.Println("ListenAndServe:", err)
		}

	}()

	go func() {
		defer Wg.Done()
		fmt.Println("HTTP server started on :3434")
		err_http := http.ListenAndServe("localhost:3434", server_http)
		if err_http != nil {
			fmt.Println("ListenAndServe:", err_http)
		}

	}()

	// bloqueia o fim da thread principal até que os dois sejam terminados.
	Wg.Wait()

}
