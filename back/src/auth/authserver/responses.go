package authserver

import "proto-generated/auth_grpc"

func makeErrorResponse(code int32, message string) auth_grpc.Result {
	return auth_grpc.Result{
		Ok:      false,
		Code:    code,
		Message: message,
	}
}

func makeSuccessfulResponse(message string) auth_grpc.Result {
	return auth_grpc.Result{
		Ok:      true,
		Code:    0,
		Message: message,
	}
}

var RES_ERR_UNKNOWN = makeErrorResponse(-1, "Unknown internal error")
var RES_SUCCESSFUL = makeSuccessfulResponse("Successful")
var RES_ERR_INVALID_EMAIL = makeErrorResponse(1, "Invalid email")
var RES_ERR_INVALID_USERNAME = makeErrorResponse(2, "Invalid username")
var RES_ERR_WEAK_PASSWORD = makeErrorResponse(3, "Password too weak")
var RES_ERR_USERNAME_REGISTERED = makeErrorResponse(4, "Username already registered")
var RES_ERR_INVALID_EMAIL_OR_PASSWORD = makeErrorResponse(5, "Invalid email/password combination")
var RES_ERR_INVALID_CONFIRMATION_CODE = makeErrorResponse(6, "Invalid confirmation code")
