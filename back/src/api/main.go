package main

import (
	"api/auth"
	"api/matchmaking"
	"api/routes"
	"context"
	"database/repositories"
	"fmt"
	"net/http"
	"os"
	"proto-generated/auth_grpc"
	"proto-generated/matchmaking_grpc"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		print("Couldn't load .env file, using default values.\n")
	}

	postgresUrl := os.Getenv("POSTGRES_URL")
	if postgresUrl == "" {
		panic("Postgres URL env var not set")
	}
	dbPool, err := pgxpool.New(context.Background(), postgresUrl)
	if err != nil {
		panic(err)
	}
	if err = dbPool.Ping(context.TODO()); err != nil {
		panic(err)
	}
	routes.SavedRepo = repositories.NewSavedGameRepo(dbPool)

	// Inicia conexão gRPC
	mmConn, err := grpc.NewClient("gameserver:9191", grpc.WithInsecure())
	if err != nil {
		panic("Couldn't stablish GRPC connection with game-server")
	}
	defer mmConn.Close()

	authConn, err := grpc.NewClient("auth:8989", grpc.WithInsecure())
	if err != nil {
		panic("Couldn't stablish GRPC connection with auth-server")
	}
	defer authConn.Close()

	time.Sleep(2 * time.Second)
	ctxStream := context.Background()
	mmGrpc := matchmaking_grpc.NewMatchMakingClient(mmConn)

	stream, err := mmGrpc.StartStreamMsg(ctxStream, &matchmaking_grpc.StartStreamingMessage{})

	if err != nil {
		fmt.Println(err)
		panic("grpc stream on gameserver failed to start")
	}

	auth.AuthGrpc = auth_grpc.NewAuthClient(authConn)

	mm := matchmaking.NewMatchmakingManager(
		mmGrpc,
		stream,
	)

	// WaitGroup apenas para o servidor WebSocket
	var wg sync.WaitGroup
	wg.Add(1)

	server_ws := http.NewServeMux()
	server_ws.HandleFunc("/ws", auth.AuthMiddleware(mm.HandleNewConnection))
	server_ws.HandleFunc("/savedgame", auth.AuthMiddleware(routes.ManageSavedGame))
	server_ws.HandleFunc("/savedgame/{id}", auth.AuthMiddleware(routes.ManageSavedGame))

	// Goroutine do WebSocket server
	go func() {
		defer wg.Done()
		fmt.Println("WebSocket server started on :8080")
		if err := http.ListenAndServe("0.0.0.0:8080", server_ws); err != nil {
			fmt.Println("ListenAndServe:", err)
		}
	}()

	// Mantém a main viva enquanto o servidor WebSocket estiver rodando
	wg.Wait()
}
