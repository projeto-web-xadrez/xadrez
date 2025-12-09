package main

import (
	"context"
	"database/repositories"
	"fmt"
	"game-server/game"
	"net"
	"net/http"
	"os"
	"proto-generated/auth_grpc"
	"proto-generated/matchmaking_grpc"
	"time"
	"utils"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
)

const DEFAULT_GRPC_ADDRESS = "0.0.0.0:9191"
const DEFAULT_AUTH_GRPC_ADDRESS = "auth:8989"
const DEFAULT_WS_PLAYER_ADDRESS = "0.0.0.0:8082"
const DEFAULT_WS_PLAYER_PATH = "/ws"

var authGrpc auth_grpc.AuthClient
var gm *game.GameManager

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 8,                                   // Incoming messages are capped at 8 KB
	WriteBufferSize: 1024 * 8,                                   // Outcoming messsages are capped at 8 KB
	CheckOrigin:     func(r *http.Request) bool { return true }, // Allow all connections
}

type MatchMakingServer struct {
	matchmaking_grpc.UnimplementedMatchMakingServer
}

func (s *MatchMakingServer) RequestRoom(ctx context.Context, req *matchmaking_grpc.RequestRoomMessage) (*matchmaking_grpc.RoomResponse, error) {
	id1, err := uuid.Parse(req.PlayerId_1)
	if err != nil {
		return &matchmaking_grpc.RoomResponse{
			RoomId:   "",
			ErrorMsg: proto.String("PlayerId_1 must be an UUID"),
		}, nil
	}
	id2, err := uuid.Parse(req.PlayerId_2)
	if err != nil {
		return &matchmaking_grpc.RoomResponse{
			RoomId:   "",
			ErrorMsg: proto.String("PlayerId_2 must be an UUID"),
		}, nil
	}

	game, err := gm.CreateNewGame(id1, id2)
	if err != nil {
		error_msg := err.Error()
		return &matchmaking_grpc.RoomResponse{
			RoomId:   "",
			ErrorMsg: &error_msg,
		}, nil
	}

	return &matchmaking_grpc.RoomResponse{
		RoomId: game.ID.String(),
	}, nil
}

func (s *MatchMakingServer) StartStreamMsg(reqMsg *matchmaking_grpc.StartStreamingMessage, stream matchmaking_grpc.MatchMaking_StartStreamMsgServer) error {
	fmt.Println("API Server connected to stream. Ready to send game_ended events")
	for {
		select {
		case <-stream.Context().Done():
			fmt.Println("API Server disconnected from stream")
			return nil

		case message, ok := <-gm.StreamChannel:
			if !ok {
				fmt.Println("Stream channel was closed")
				return nil
			}

			// Send the msg
			if err := stream.Send(&message); err != nil {
				fmt.Printf("Got error while sending stream msg: %v\n", err)
				return err
			}

			fmt.Printf("Game Ended Notification sent: %v\n", message)
		}
	}

}

func handlePlayerConnection(w http.ResponseWriter, r *http.Request) {
	sessionToken, err := r.Cookie("session_token")
	csrfToken := r.URL.Query().Get("csrfToken")

	if err != nil || csrfToken == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !utils.ValidateCSRFToken(csrfToken, sessionToken.Value) {
		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    "",
			Expires:  time.Now().Add(-time.Hour),
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	res, err := authGrpc.ValidateSession(context.Background(), &auth_grpc.SessionValidationInput{
		Token: sessionToken.Value,
	})

	if err != nil || !res.Res.Ok {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}

	if res.Session == nil || res.Session.UserId == "" {
		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    "",
			Expires:  time.Now().Add(-time.Hour),
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	p := gm.GetOrMakePlayer(uuid.MustParse(res.Session.UserId), res.Session.Username)
	ws, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		return
	}

	ws.SetCloseHandler(func(code int, text string) error {
		p.OnWsClosed(ws)
		return nil
	})

	p.UpdateConnection(ws)
}

func main() {
	err := godotenv.Load()
	if err != nil {
		print("Couldn't load .env file, using default values.\n")
	}

	postgresUrl := os.Getenv("POSTGRES_URL")
	authGrpcAddress := os.Getenv("AUTH_GRPC_ADDRESS")
	grpcAddress := os.Getenv("GRPC_ADDRESS")
	WSPlayerAddress := os.Getenv("WS_PLAYER_ADDRESS")
	WSPlayerPath := os.Getenv("WS_PLAYER_PATH")

	if authGrpcAddress == "" {
		authGrpcAddress = DEFAULT_AUTH_GRPC_ADDRESS
	}
	if postgresUrl == "" {
		panic("Postgres URL env var not set")
	}
	if grpcAddress == "" {
		grpcAddress = DEFAULT_GRPC_ADDRESS
	}
	if WSPlayerAddress == "" {
		WSPlayerAddress = DEFAULT_WS_PLAYER_ADDRESS
	}
	if WSPlayerPath == "" {
		WSPlayerPath = DEFAULT_WS_PLAYER_PATH
	}

	dbPool, err := pgxpool.New(context.Background(), postgresUrl)
	if err != nil {
		panic(err)
	}
	if err = dbPool.Ping(context.TODO()); err != nil {
		panic(err)
	}

	authConn, err := grpc.NewClient(authGrpcAddress, grpc.WithInsecure())
	if err != nil {
		panic("Couldn't stablish GRPC connection with auth-server")
	}

	authGrpc = auth_grpc.NewAuthClient(authConn)

	userRepo := repositories.NewUserRepo(dbPool)
	gameRepo := repositories.NewGameRepo(dbPool)
	gm = game.NewGameManager(userRepo, gameRepo)

	go func() {
		grpcListener, err := net.Listen("tcp", grpcAddress)
		if err != nil {
			fmt.Println(err)
			panic(err)
		}

		server := grpc.NewServer()
		matchmaking_grpc.RegisterMatchMakingServer(server, &MatchMakingServer{})
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
