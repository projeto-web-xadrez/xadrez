package main

import (
	"context"
	"proto-generated/auth_grpc"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthServer struct {
	auth_grpc.UnimplementedAuthServer
}

/*
TODO:
- Assert that neither the email nor the username is already in use, and make an email request to the provided email
- Once the request gets accepted, perform the registration
*/
func (AuthServer) RegisterAccount(context.Context, *auth_grpc.RegisterAccountRequestMessage) (*auth_grpc.RegisterAccountResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method RegisterAccount not implemented")
}

/*
TODO:
- Assert that password hash matches the one stored in database
- Once it's asserted, generate a csrf/session token and return it
*/
func (AuthServer) Login(context.Context, *auth_grpc.LoginRequestMessage) (*auth_grpc.LoginResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method Login not implemented")
}

/*
TODO:
- Check if the csrf/session token is valid, and if it is, return user data
*/
func (AuthServer) CheckToken(context.Context, *auth_grpc.CheckTokenRequestMessage) (*auth_grpc.CheckTokenResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method CheckToken not implemented")
}

/*
TODO:
- Verify if the email request code exists, and if it does, execute the function attached to it
*/
func (AuthServer) ConfirmEmail(context.Context, *auth_grpc.ConfirmEmailRequestMessage) (*auth_grpc.ConfirmEmailResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ConfirmEmail not implemented")
}

/*
TODO:
- Check if the token is valid, get the user's email from it and send it a request
- If the email request gets approved, send another confirmation email to the new email
- Only perform the action once the second confirmation gets approved
*/
func (AuthServer) ChangeEmail(context.Context, *auth_grpc.ChangeEmailRequestMessage) (*auth_grpc.ChangeEmailResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ChangeEmail not implemented")
}

/*
TODO:
- Check if there's a user with that email, and send it an email request
- If the email request gets approved, change the user's password and invalidate all sessions
that differs from the original one (which can be null if the request was made from a signed out user)
*/
func (AuthServer) ChangePassword(context.Context, *auth_grpc.ChangePasswordRequestMessage) (*auth_grpc.ChangePasswordResponseMessage, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ChangePassword not implemented")
}
