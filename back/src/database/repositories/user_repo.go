package repositories

import (
	"context"
	"database"
	"database/models"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	dbPool *pgxpool.Pool
}

func NewUserRepo(dbPool *pgxpool.Pool) *UserRepo {
	return &UserRepo{
		dbPool: dbPool,
	}
}

func (repo *UserRepo) CreateUser(ctx context.Context, username string, email string, password string) (*models.User, error) {
	query := `INSERT INTO chess.user(username, email, password_hash) VALUES ($1, $2, $3) 
			  RETURNING user_id, username, email, created_at, password_hash;`

	user := models.User{}
	row := repo.dbPool.QueryRow(ctx, query, username, email, password)

	if err := row.Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt, &user.PasswordHash); err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			return nil, &database.ConflictError{Constraint: pgErr.ConstraintName}
		}
		return nil, err
	}

	return &user, nil
}
