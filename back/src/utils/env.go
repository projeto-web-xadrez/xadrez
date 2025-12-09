package utils

import (
	"fmt"
	"os"
)

func GetEnvVarOrPanic(variable string, description string) string {
	value := os.Getenv(variable)
	if value == "" {
		panic(fmt.Sprintf("%s env var not set (%s)", description, variable))
	}
	return value
}
