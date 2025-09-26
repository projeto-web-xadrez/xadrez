package main

import (
	"encoding/json"
	"fmt"
	"net/http"
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

			time.Sleep(1 * time.Second)
			if err := ws.WriteMessage(websocket.TextMessage, responseBytes); err != nil {
				fmt.Println("write error", err)
				break
			}
			break
		default:
			break
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleConnections)

	fmt.Println("WebSocket server started on :8080")
	// se colocar só :8080 ele fica pedindo permissao ao firewall
	err := http.ListenAndServe("localhost:8080", nil)
	if err != nil {
		fmt.Println("ListenAndServe:", err)
	}
}
