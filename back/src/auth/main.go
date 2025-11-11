package main

import (
	"auth/email"
	"context"
	"database/repositories"
	"fmt"
	"net"
	"os"
	"proto-generated/auth_grpc"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

func main() {
	godotenv.Load()
	emailPort, err := strconv.Atoi(os.Getenv("EMAIL_SMTP_PORT"))
	if err != nil {
		panic(err)
	}

	emailSender, err := email.NewEmailSender(
		os.Getenv("EMAIL_SMTP_USERNAME"),
		os.Getenv("EMAIL_SMTP_PASSWORD"),
		os.Getenv("EMAIL_SMTP_HOST"),
		emailPort,
		os.Getenv("EMAIL_NAME"),
		os.Getenv("EMAIL_TEMPLATE_DIR"),
	)

	if err != nil {
		panic(err)
	}

	grpcListener, err := net.Listen("tcp", "0.0.0.0:8989")
	if err != nil {
		panic(err)
	}

	dbPool, err := pgxpool.New(context.Background(), os.Getenv("POSTGRES_URL"))
	if err != nil {
		panic(err)
	}
	if err = dbPool.Ping(context.TODO()); err != nil {
		panic(err)
	}

	userRepo := repositories.NewUserRepo(dbPool)

	server := grpc.NewServer()
	auth_grpc.RegisterAuthServer(server, &AuthServer{emailSender: emailSender, userRepo: userRepo})
	fmt.Printf("GRPC internal server listening at %s\n", grpcListener.Addr())
	err = server.Serve(grpcListener)
	if err != nil {
		panic(err)
	}
}
