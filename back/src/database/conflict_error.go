package database

import "fmt"

type ConflictError struct {
	Constraint string
}

func (e *ConflictError) Error() string {
	return fmt.Sprintf("conflict error occurred, caused by the constraint \"%s\"", e.Constraint)
}
