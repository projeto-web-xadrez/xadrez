package main

import (
	"api/auth"
	"api/matchmaking"
	"api/routes"
	"context"
	"database/repositories"
	"fmt"
	"net/http"
	"proto-generated/auth_grpc"
	"proto-generated/matchmaking_grpc"
	"sync"
	"time"
	"utils"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

func main() {
	godotenv.Load()

	postgresUrl := utils.GetEnvVarOrPanic("POSTGRES_URL", "Postgres URL")
	authGrpcAddress := utils.GetEnvVarOrPanic("INTERNAL_GRPC_AUTH_ADDRESS", "Auth GRPC address")
	matchmakingGrpcAddress := utils.GetEnvVarOrPanic("INTERNAL_GRPC_MATCHMAKING_ADDRESS", "Matchmaking GRPC address")
	port := utils.GetEnvVarOrPanic("PORT_API", "API Port")

	dbPool, err := pgxpool.New(context.Background(), postgresUrl)
	if err != nil {
		panic(err)
	}
	if err = dbPool.Ping(context.TODO()); err != nil {
		panic(err)
	}

	routes.GameRepo = repositories.NewGameRepo(dbPool)
	routes.SavedGamesRepo = repositories.NewSavedGameRepo(dbPool)
	routes.UserRepo = repositories.NewUserRepo(dbPool)

	// Inicia conexão gRPC
	mmConn, err := grpc.NewClient(matchmakingGrpcAddress, grpc.WithInsecure())
	if err != nil {
		panic("Couldn't stablish GRPC connection with game-server")
	}
	defer mmConn.Close()

	authConn, err := grpc.NewClient(authGrpcAddress, grpc.WithInsecure())
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
	server_ws.HandleFunc("/savedgame", auth.AuthMiddleware(routes.SavedGameRouter))
	server_ws.HandleFunc("/savedgame/{id}", auth.AuthMiddleware(routes.SavedGameRouter))
	server_ws.HandleFunc("/game", routes.GameRouter)
	server_ws.HandleFunc("/game/{id}", routes.GameRouter)
	server_ws.HandleFunc("/userstats/{id}", routes.UserStatsRouter)

	// Goroutine do WebSocket server
	go func() {
		defer wg.Done()
		fmt.Println("WebSocket server started on :" + port)
		if err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%s", port), server_ws); err != nil {
			fmt.Println("ListenAndServe:", err)
		}
	}()

	// Mantém a main viva enquanto o servidor WebSocket estiver rodando
	wg.Wait()
}
