package authserver

import (
	"auth/authmanager"
	"proto-generated/auth_grpc"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func makeSession(session *authmanager.Session) *auth_grpc.Session {
	return &auth_grpc.Session{
		UserId:   session.UserID,
		Token:    session.Token,
		Email:    session.Email,
		Username: session.Username,
		Issued:   timestamppb.New(session.SessionCreatedAt),
		Expires:  timestamppb.New(session.ExpiresAt),
	}
}
