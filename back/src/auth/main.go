package auth

import (
	"context"
	"fmt"
	"net"
	"proto-generated/auth_grpc"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthServer struct {
	auth_grpc.UnimplementedAuthServer
}

func (AuthServer) RegisterAccount(context.Context, *auth_grpc.RegisterAccountRequestMessage) (*auth_grpc.RegisterAccountResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method RegisterAccount not implemented")
}
func (AuthServer) Login(context.Context, *auth_grpc.LoginRequestMessage) (*auth_grpc.LoginResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method Login not implemented")
}
func (AuthServer) CheckToken(context.Context, *auth_grpc.CheckTokenRequestMessage) (*auth_grpc.CheckTokenResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method CheckToken not implemented")
}
func (AuthServer) ConfirmEmail(context.Context, *auth_grpc.ConfirmEmailRequestMessage) (*auth_grpc.ConfirmEmailResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ConfirmEmail not implemented")
}
func (AuthServer) ChangeEmail(context.Context, *auth_grpc.ChangeEmailRequestMessage) (*auth_grpc.ChangeEmailResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ChangeEmail not implemented")
}
func (AuthServer) ChangePassword(context.Context, *auth_grpc.ChangePasswordRequestMessage) (*auth_grpc.ChangePasswordResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ChangePassword not implemented")
}

func main() {
	grpcListener, err := net.Listen("tcp", "0.0.0.0:8989")
	if err != nil {
		panic(err)
	}

	server := grpc.NewServer()
	auth_grpc.RegisterAuthServer(server, &AuthServer{})
	fmt.Printf("GRPC internal server listening at %s\n", grpcListener.Addr())
	err = server.Serve(grpcListener)
	if err != nil {
		panic(err)
	}
}
