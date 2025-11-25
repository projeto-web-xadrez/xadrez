package authserver

import (
	"auth/authmanager"
	"auth/mailsender"
	"auth/verificationmanager"
	"context"
	"database/repositories"
	"proto-generated/auth_grpc"
	"time"
	"utils"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type Config struct {
	MinExecTimeForCriticalFuncs time.Duration
}

type AuthServer struct {
	auth_grpc.UnimplementedAuthServer
	userRepo            *repositories.UserRepo
	emailSender         *mailsender.EmailSender
	verificationManager *verificationmanager.VerificationManager
	authManager         *authmanager.AuthManager
	config              *Config
}

func NewAuthServer(userRepo *repositories.UserRepo, emailSender *mailsender.EmailSender, verificationManager *verificationmanager.VerificationManager, authManager *authmanager.AuthManager, config *Config) *AuthServer {
	return &AuthServer{emailSender: emailSender, userRepo: userRepo, verificationManager: verificationManager, authManager: authManager, config: config}
}

type confirmRegistrationFuncType func(ctx context.Context, req *auth_grpc.EmailVerificationInput) (*auth_grpc.UserLoggedIn, error)
type confirmChangePasswordRequestFuncType func(ctx context.Context, req *auth_grpc.EmailVerificationInput) (*auth_grpc.PasswordChangeRequest, error)
type confirmPasswordChangeFuncType func(ctx context.Context, req *auth_grpc.PasswordChangeInput) (*auth_grpc.UserLoggedIn, error)

func (server *AuthServer) Login(ctx context.Context, req *auth_grpc.LoginInput) (*auth_grpc.UserLoggedIn, error) {
	_, session, err := server.authManager.Login(ctx, req.OriginIp, req.Email, req.Password)
	if err != nil {
		if err == authmanager.ErrInvalidPassword || err == authmanager.ErrUserNotFound {
			return &auth_grpc.UserLoggedIn{
				Res: &RES_ERR_INVALID_EMAIL_OR_PASSWORD,
			}, nil
		}
		return &auth_grpc.UserLoggedIn{
			Res: &RES_ERR_UNKNOWN,
		}, nil
	}

	return &auth_grpc.UserLoggedIn{
		Res:     &RES_SUCCESSFUL,
		Session: makeSession(session),
	}, nil
}
func (server *AuthServer) StartRegistration(ctx context.Context, req *auth_grpc.StartRegistrationInput) (*auth_grpc.EmailVerificationPending, error) {
	var err error = nil
	req.Email, err = utils.NormalizeEmail(req.Email)
	if err != nil {
		return &auth_grpc.EmailVerificationPending{
			Res: &RES_ERR_INVALID_EMAIL,
		}, nil
	}

	if !utils.ValidateUsername(req.Username) {
		return &auth_grpc.EmailVerificationPending{
			Res: &RES_ERR_INVALID_USERNAME,
		}, nil
	}

	if !utils.ValidatePassword(req.Password) {
		return &auth_grpc.EmailVerificationPending{
			Res: &RES_ERR_WEAK_PASSWORD,
		}, nil
	}

	usernameExists, emailExists, err := server.userRepo.CheckUsernameOrPasswordExistence(ctx, req.Username, req.Email)
	if err != nil {
		return &auth_grpc.EmailVerificationPending{
			Res: &RES_ERR_UNKNOWN,
		}, nil
	}

	if usernameExists {
		return &auth_grpc.EmailVerificationPending{
			Res: &RES_ERR_USERNAME_REGISTERED,
		}, nil
	}

	if emailExists {
		// Return fake verification to avoid revealing registered emails
		return &auth_grpc.EmailVerificationPending{
			Res:               &RES_SUCCESSFUL,
			Email:             proto.String(req.Email),
			VerificationToken: proto.String(verificationmanager.GenerateFakeToken()),
			VerificationType:  proto.String("register"),
		}, nil
	}

	var confirmFunc confirmRegistrationFuncType = func(verificationCtx context.Context, verificationReq *auth_grpc.EmailVerificationInput) (*auth_grpc.UserLoggedIn, error) {

		if verificationReq.OriginIp != req.OriginIp {

		}

		user, session, err := server.authManager.Register(verificationCtx, verificationReq.OriginIp, req.Email, req.Username, req.Password)

		// We could have created the user but returned some error when generating the session
		if user != nil {
			go server.emailSender.SendEmail(user.Email, "Welcome", "welcome", map[string]string{
				"Username": user.Username,
			})
		}

		if err != nil {
			return &auth_grpc.UserLoggedIn{
				Res: &RES_ERR_UNKNOWN,
			}, nil
		}

		return &auth_grpc.UserLoggedIn{
			Res:     &RES_SUCCESSFUL,
			Session: makeSession(session),
		}, nil
	}

	verificationToken := server.verificationManager.RegisterToken(
		confirmFunc, "register", time.Minute*10,
	)

	go server.emailSender.SendEmail(req.Email, "Registration", "register", map[string]string{
		"Code":       verificationToken.VerificationCode,
		"Expiration": "10 minutes",
	})

	return &auth_grpc.EmailVerificationPending{
		Res:               &RES_SUCCESSFUL,
		Email:             proto.String(req.Email),
		VerificationToken: &verificationToken.Token,
		VerificationType:  proto.String("register"),
	}, nil
}
func (server *AuthServer) ConfirmRegistration(ctx context.Context, req *auth_grpc.EmailVerificationInput) (*auth_grpc.UserLoggedIn, error) {
	function, err := server.verificationManager.RetrieveFunction(req.VerificationToken, "register", req.VerificationCode)
	if err != nil {
		return &auth_grpc.UserLoggedIn{
			Res: &RES_ERR_INVALID_CONFIRMATION_CODE,
		}, nil
	}

	if f, ok := function.(confirmRegistrationFuncType); ok {
		return f(ctx, req)
	}

	return &auth_grpc.UserLoggedIn{
		Res: &RES_ERR_UNKNOWN,
	}, nil
}
func (server *AuthServer) StartPasswordChange(ctx context.Context, req *auth_grpc.StartPasswordChangeInput) (*auth_grpc.EmailVerificationPending, error) {
	startTime := time.Now()

	user, err := server.userRepo.GetUserByEmail(ctx, req.Email)

	if err != nil || user == nil {
		elapsedTime := time.Since(startTime)
		if elapsedTime < server.config.MinExecTimeForCriticalFuncs {
			time.Sleep(server.config.MinExecTimeForCriticalFuncs - elapsedTime)
		}
		// Return fake verification to avoid revealing registered emails
		return &auth_grpc.EmailVerificationPending{
			Res:               &RES_SUCCESSFUL,
			Email:             proto.String(req.Email),
			VerificationToken: proto.String(verificationmanager.GenerateFakeToken()),
			VerificationType:  proto.String("register"),
		}, nil
	}

	elapsedTime := time.Since(startTime)
	if elapsedTime < server.config.MinExecTimeForCriticalFuncs {
		time.Sleep(server.config.MinExecTimeForCriticalFuncs - elapsedTime)
	}

	var confirmFunc confirmChangePasswordRequestFuncType = func(context.Context, *auth_grpc.EmailVerificationInput) (*auth_grpc.PasswordChangeRequest, error) {
		var confirmFunc2 confirmPasswordChangeFuncType = func(changeCtx context.Context, changeReq *auth_grpc.PasswordChangeInput) (*auth_grpc.UserLoggedIn, error) {
			if !utils.ValidatePassword(changeReq.NewPassword) {
				return &auth_grpc.UserLoggedIn{
					Res: &RES_ERR_WEAK_PASSWORD,
				}, nil
			}

			// TODO: send email telling the user that his password was changed
			// and maybe send the IP address who changed the password

			user, session, err := server.authManager.ChangePassword(changeCtx, changeReq.OriginIp, req.Email, changeReq.NewPassword)
			if err != nil || user == nil {
				return &auth_grpc.UserLoggedIn{
					Res: &RES_ERR_UNKNOWN,
				}, nil
			}

			return &auth_grpc.UserLoggedIn{
				Res:     &RES_SUCCESSFUL,
				Session: makeSession(session),
			}, nil
		}

		verificationToken2 := server.verificationManager.RegisterToken(confirmFunc2, "password2", time.Minute*10)

		return &auth_grpc.PasswordChangeRequest{
			Res:                 &RES_SUCCESSFUL,
			PasswordChangeToken: proto.String(verificationToken2.Token),
			PasswordChangeCode:  proto.String(verificationToken2.VerificationCode),
		}, nil
	}

	verificationToken := server.verificationManager.RegisterToken(
		confirmFunc, "password1", time.Minute*10,
	)

	go server.emailSender.SendEmail(req.Email, "Changing Password", "change-password", map[string]string{
		"Code":       verificationToken.VerificationCode,
		"Expiration": "10 minutes",
	})

	return &auth_grpc.EmailVerificationPending{
		Res:               &RES_SUCCESSFUL,
		Email:             proto.String(req.Email),
		VerificationToken: &verificationToken.Token,
		VerificationType:  proto.String("password1"),
	}, nil
}
func (server *AuthServer) PasswordChangeVerifyEmail(ctx context.Context, req *auth_grpc.EmailVerificationInput) (*auth_grpc.PasswordChangeRequest, error) {
	function, err := server.verificationManager.RetrieveFunction(req.VerificationToken, "password1", req.VerificationCode)
	if err != nil {
		return &auth_grpc.PasswordChangeRequest{
			Res: &RES_ERR_INVALID_CONFIRMATION_CODE,
		}, nil
	}

	if f, ok := function.(confirmChangePasswordRequestFuncType); ok {
		return f(ctx, req)
	}

	return &auth_grpc.PasswordChangeRequest{
		Res: &RES_ERR_UNKNOWN,
	}, nil
}
func (server *AuthServer) ChangePassword(ctx context.Context, req *auth_grpc.PasswordChangeInput) (*auth_grpc.UserLoggedIn, error) {
	function, err := server.verificationManager.RetrieveFunction(req.PasswordChangeToken, "password2", req.PasswordChangeCode)

	if err != nil {
		return &auth_grpc.UserLoggedIn{
			Res: &RES_ERR_INVALID_CONFIRMATION_CODE,
		}, nil
	}

	if f, ok := function.(confirmPasswordChangeFuncType); ok {
		return f(ctx, req)
	}

	return &auth_grpc.UserLoggedIn{
		Res: &RES_ERR_UNKNOWN,
	}, nil
}
func (server *AuthServer) StartEmailChange(context.Context, *auth_grpc.StartEmailChangeInput) (*auth_grpc.EmailVerificationPending, error) {
	return nil, status.Errorf(codes.Unimplemented, "method StartEmailChange not implemented")
}
func (server *AuthServer) EmailChangeVerifyCurrentEmail(context.Context, *auth_grpc.EmailVerificationInput) (*auth_grpc.EmailChangeRequest, error) {
	return nil, status.Errorf(codes.Unimplemented, "method EmailChangeVerifyCurrentEmail not implemented")
}
func (server *AuthServer) ChangeEmail(context.Context, *auth_grpc.ChangeEmailInput) (*auth_grpc.EmailVerificationPending, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ChangeEmail not implemented")
}
func (server *AuthServer) ConfirmEmailChange(context.Context, *auth_grpc.EmailVerificationInput) (*auth_grpc.UserLoggedIn, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ConfirmEmailChange not implemented")
}
