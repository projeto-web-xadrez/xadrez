package main

import (
	"auth/email"
	"context"
	"database"
	"database/repositories"
	"fmt"
	"proto-generated/auth_grpc"

	"utils"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthServer struct {
	auth_grpc.UnimplementedAuthServer
	userRepo    *repositories.UserRepo
	emailSender *email.EmailSender
}

/*
TODO:
- Assert that neither the email nor the username is already in use, and make an email request to the provided email
- Once the request gets accepted, perform the registration
*/
func (server *AuthServer) RegisterAccount(ctx context.Context, req *auth_grpc.RegisterAccountRequestMessage) (*auth_grpc.RegisterAccountResponseMessage, error) {
	if !utils.ValidateEmail(req.Email) {
		return &auth_grpc.RegisterAccountResponseMessage{
			Res: &auth_grpc.Result{
				Code:    1,
				Message: "Invalid email",
			},
		}, nil
	}

	if !utils.ValidateUsername(req.Username) {
		return &auth_grpc.RegisterAccountResponseMessage{
			Res: &auth_grpc.Result{
				Code:    2,
				Message: "Invalid username",
			},
		}, nil
	}
	if !utils.ValidatePassword(req.Password) {
		return &auth_grpc.RegisterAccountResponseMessage{
			Res: &auth_grpc.Result{
				Code:    3,
				Message: "Password too weak",
			},
		}, nil
	}

	user, err := server.userRepo.CreateUser(ctx, req.Username, req.Email, req.Password)
	if err != nil {

		if codifiedErr, ok := err.(*database.ConflictError); ok {
			switch codifiedErr.Constraint {
			case "user_email_key":
				return &auth_grpc.RegisterAccountResponseMessage{
					Res: &auth_grpc.Result{
						Code:    0,
						Message: "Confirm the email address",
					},
				}, nil
			case "user_username_key":
				return &auth_grpc.RegisterAccountResponseMessage{
					Res: &auth_grpc.Result{
						Code:    4,
						Message: "Username already registered",
					},
				}, nil
			}
		}

		fmt.Println("Unknown trying to register user: %v\n", err)
		return &auth_grpc.RegisterAccountResponseMessage{
			Res: &auth_grpc.Result{
				Code:    -1,
				Message: "Unknown error",
			},
		}, nil
	}

	fmt.Printf("%v\n", user)

	return &auth_grpc.RegisterAccountResponseMessage{
		Res: &auth_grpc.Result{
			Code:    0,
			Message: "Confirm the email address",
		},
	}, nil
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
