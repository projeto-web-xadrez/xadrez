package main

import (
	"fmt"
	"net"
	"proto-generated/auth_grpc"

	"google.golang.org/grpc"
)

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
