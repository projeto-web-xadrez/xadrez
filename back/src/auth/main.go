package main

import (
	"auth/authmanager"
	"auth/authserver"
	"auth/mailsender"
	"auth/verificationmanager"
	"context"
	"database/repositories"
	"fmt"
	"net"
	"os"
	"proto-generated/auth_grpc"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
)

func main() {
	godotenv.Load()
	emailPort, err := strconv.Atoi(os.Getenv("EMAIL_SMTP_PORT"))
	if err != nil {
		panic(err)
	}

	emailSender, err := mailsender.NewEmailSender(
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

	redisClient := redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDRESS"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	_, err = redisClient.Ping(context.TODO()).Result()
	if err != nil {
		fmt.Println("Error pinging redis")
		panic(err)
	}

	userRepo := repositories.NewUserRepo(dbPool)

	verificationManager := verificationmanager.NewVerificationManager(5 * time.Minute)

	authManager := authmanager.NewAuthManager(
		redisClient,
		userRepo,
		&authmanager.Config{
			TokenDuration: 24 * time.Hour,
			// Minimum time for register/login function to be executed (protect against timebased attacks)
			MinLoginTime: 150 * time.Millisecond,
		},
	)

	server := grpc.NewServer()
	auth_grpc.RegisterAuthServer(server, authserver.NewAuthServer(userRepo, emailSender, verificationManager, authManager, &authserver.Config{
		// Minimum time for critical functions to be executed (protect against timebased attacks)
		MinExecTimeForCriticalFuncs: 150 * time.Millisecond,
	}))
	fmt.Printf("GRPC internal server listening at %s\n", grpcListener.Addr())
	err = server.Serve(grpcListener)
	if err != nil {
		panic(err)
	}
}
