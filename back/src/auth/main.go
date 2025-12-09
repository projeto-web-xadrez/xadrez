package main

import (
	"auth/authmanager"
	"auth/authserver"
	"auth/mailsender"
	"auth/verificationmanager"
	"database/repositories"
	"fmt"
	"net"
	"os"
	"proto-generated/auth_grpc"
	"strconv"
	"time"
	"utils"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

func main() {
	godotenv.Load()

	emailSmtpUsername := utils.GetEnvVarOrPanic("EMAIL_SMTP_USERNAME", "Email SMTP Username")
	emailSmtpPassword := utils.GetEnvVarOrPanic("EMAIL_SMTP_PASSWORD", "Email SMTP Password")
	emailSmtpHost := utils.GetEnvVarOrPanic("EMAIL_SMTP_HOST", "Email SMTP Host")
	emailSmtpPort := utils.GetEnvVarOrPanic("EMAIL_SMTP_PORT", "Email SMTP Port")
	emailName := utils.GetEnvVarOrPanic("EMAIL_NAME", "Email Name")
	emailTemplateDir := utils.GetEnvVarOrPanic("EMAIL_TEMPLATE_DIR", "Email Template Directory")
	postgresUrl := utils.GetEnvVarOrPanic("POSTGRES_URL", "Postgres URL")
	redisAddress := utils.GetEnvVarOrPanic("REDIS_ADDRESS", "Redis Address")
	port := utils.GetEnvVarOrPanic("INTERNAL_PORT_AUTH_GRPC", "Auth GRPC Port")

	redisPassword := os.Getenv("REDIS_PASSWORD")
	if redisPassword == "" {
		println("WARNING: Redis password may be blank or is not defined")
	}

	emailPort, err := strconv.Atoi(emailSmtpPort)
	if err != nil {
		panic("Email port is not an integer")
	}

	emailSender, err := mailsender.NewEmailSender(
		emailSmtpUsername,
		emailSmtpPassword,
		emailSmtpHost,
		emailPort,
		emailName,
		emailTemplateDir,
	)

	if err != nil {
		panic(err)
	}

	dbPool := utils.RetryPostgresConnection(postgresUrl, time.Second)
	userRepo := repositories.NewUserRepo(dbPool)

	redisClient := utils.RetryRedisConnection(redisAddress, redisPassword, time.Second)

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

	grpcListener, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%s", port))
	if err != nil {
		panic(err)
	}

	fmt.Printf("GRPC internal server listening at %s\n", grpcListener.Addr())
	err = server.Serve(grpcListener)
	if err != nil {
		panic(err)
	}
}
