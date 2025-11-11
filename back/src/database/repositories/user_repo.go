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

	//TODO: use pgx.CollectRows() (better syntax for retrieving a struct from db)
	if err := row.Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt, &user.PasswordHash); err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			return nil, &database.ConflictError{Constraint: pgErr.ConstraintName}
		}
		return nil, err
	}

	return &user, nil
}

func (repo *UserRepo) CheckUserExistence(ctx context.Context, username string, email string) (bool, bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM chess.user WHERE username = $1),
    				 EXISTS(SELECT 1 FROM chess.user WHERE email = $2);`

	usernameExists := false
	emailExists := false
	err := repo.dbPool.QueryRow(ctx, query, username, email).Scan(
		&usernameExists, &emailExists,
	)
	if err != nil {
		return false, false, err
	}

	return usernameExists, emailExists, nil
}

func (repo *UserRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT (user_id, username, email, created_at, password_hash) FROM chess.user WHERE email=$1;`

	user := models.User{}
	row, err := repo.dbPool.Query(ctx, query, email)

	if err != nil {
		return nil, err
	}

	if !row.Next() {
		return nil, nil
	}

	//TODO: use pgx.CollectRows() (better syntax for retrieving a struct from db)
	err = row.Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt, &user.PasswordHash)
	if err != nil {
		return nil, err
	}
	return &user, err
}
