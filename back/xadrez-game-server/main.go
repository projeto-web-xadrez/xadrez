package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"xadrez-game-server/gamelogic"
	"xadrez-game-server/internalgrpc"

	"github.com/corentings/chess/v2"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

const DEFAULT_GRPC_ADDRESS = "localhost:9191"
const DEFAULT_WS_PLAYER_ADDRESS = "localhost:8082"
const DEFAULT_WS_PLAYER_PATH = "/ws"

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 8,                                   // Incoming messages are capped at 8 KB
	WriteBufferSize: 1024 * 8,                                   // Outcoming messsages are capped at 8 KB
	CheckOrigin:     func(r *http.Request) bool { return true }, // Allow all connections
}

type InternalServer struct {
	internalgrpc.UnimplementedInternalServer
}

func (s *InternalServer) RequestRoom(ctx context.Context, req *internalgrpc.RequestRoomMessage) (*internalgrpc.RoomResponse, error) {
	room, err := gamelogic.CreateNewRoom(req.PlayerId_1, req.PlayerId_2)
	if err != nil {
		error_msg := err.Error()
		return &internalgrpc.RoomResponse{
			RoomId:   "",
			ErrorMsg: &error_msg,
		}, nil
	}

	return &internalgrpc.RoomResponse{
		RoomId: room.RoomID,
	}, nil
}

func handlePlayerConnection(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	gamelogic.HandleNewClient(ws)
}

func main() {
	err := godotenv.Load()
	if err != nil {
		print("Couldn't load .env file, using default values.\n")
	}

	grpcAddress := os.Getenv("GRPC_ADDRESS")
	WSPlayerAddress := os.Getenv("WS_PLAYER_ADDRESS")
	WSPlayerPath := os.Getenv("WS_PLAYER_PATH")

	if grpcAddress == "" {
		grpcAddress = DEFAULT_GRPC_ADDRESS
	}
	if WSPlayerAddress == "" {
		WSPlayerAddress = DEFAULT_WS_PLAYER_ADDRESS
	}
	if WSPlayerPath == "" {
		WSPlayerPath = DEFAULT_WS_PLAYER_PATH

	}

	go func() {
		grpcListener, err := net.Listen("tcp", grpcAddress)
		if err != nil {
			panic(err)
		}

		server := grpc.NewServer()
		internalgrpc.RegisterInternalServer(server, &InternalServer{})
		fmt.Printf("GRPC internal server listening at %s\n", grpcAddress)
		err = server.Serve(grpcListener)
		if err != nil {
			panic(err)
		}
	}()

	http.HandleFunc(WSPlayerPath, handlePlayerConnection)

	fmt.Printf("WS player server listening at %s\n", WSPlayerAddress)
	err = http.ListenAndServe(WSPlayerAddress, nil)
	if err != nil {
		panic(err)
	}

}
