package repositories

import (
	"context"
	"database"
	"database/models"
	"errors"
	"utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

func (repo *UserRepo) GetUserWithStats(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	query := `SELECT 
			u.user_id, u.username, u.email, u.created_at,
			s.wins, s.draws, s.losses, s.games_played, s.last_updated
		FROM chess.user u
		LEFT JOIN chess.user_stats s ON u.user_id = s.user_id
		WHERE u.user_id = $1
	`

	rows, err := repo.dbPool.Query(ctx, query, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	user := models.User{
		Stats: &models.UserStats{},
	}
	err = repo.dbPool.QueryRow(ctx, query, userID).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.CreatedAt,
		&user.Stats.Wins,
		&user.Stats.Draws,
		&user.Stats.Losses,
		&user.Stats.GamesPlayed,
		&user.Stats.LastUpdated,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (repo *UserRepo) GetUserStats(ctx context.Context, userID uuid.UUID) (*models.UserStats, error) {
	query := `SELECT * FROM chess.user_stats WHERE user_id=$1;`

	rows, err := repo.dbPool.Query(ctx, query, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	userStats, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.UserStats])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &userStats, nil
}

func (repo *UserRepo) UpdateUserPasswordByEmail(ctx context.Context, email string, newPassword string, includeCredentials bool) (*models.User, error) {
	if !utils.ValidatePassword(newPassword) {
		return nil, errors.New("password is not in a valid format")
	}

	query := `UPDATE chess.user SET password_hash = $1 WHERE email = $2 RETURNING user_id, username, email, created_at, password_hash;`

	user := models.User{}
	row := repo.dbPool.QueryRow(ctx, query, newPassword, email)

	//TODO: use pgx.CollectRows() (better syntax for retrieving a struct from db)
	if err := row.Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt, &user.PasswordHash); err != nil {
		return nil, err
	}

	if !includeCredentials {
		user.PasswordHash = ""
	}
	return &user, nil
}

func (repo *UserRepo) CreateUser(ctx context.Context, username string, email string, password string, includeCredentials bool) (*models.User, error) {
	email, err := utils.NormalizeEmail(email)
	if err != nil {
		return nil, errors.New("email is not in a valid format")
	}

	if !utils.ValidateUsername(username) {
		return nil, errors.New("username is not in a valid format")
	}

	if !utils.ValidatePassword(password) {
		return nil, errors.New("password is not in a valid format")
	}

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

	if !includeCredentials {
		user.PasswordHash = ""
	}
	return &user, nil
}

func (repo *UserRepo) CheckUsernameOrEmailExistence(ctx context.Context, username string, email string) (bool, bool, error) {
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

func (repo *UserRepo) GetUserByID(ctx context.Context, userID uuid.UUID, includeCredentials bool) (*models.User, error) {
	query := `SELECT user_id, username, email, created_at, password_hash FROM chess.user WHERE user_id=$1;`

	rows, err := repo.dbPool.Query(ctx, query, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	user, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.User])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if !includeCredentials {
		user.PasswordHash = ""
	}
	return &user, nil
}

func (repo *UserRepo) GetUserByEmail(ctx context.Context, email string, includeCredentials bool) (*models.User, error) {
	query := `SELECT user_id, username, email, created_at, password_hash FROM chess.user WHERE email = $1`

	rows, err := repo.dbPool.Query(ctx, query, email)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	user, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.User])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if !includeCredentials {
		user.PasswordHash = ""
	}
	return &user, nil
}

func (repo *UserRepo) GetUserByUsername(ctx context.Context, username string, includeCredentials bool) (*models.User, error) {
	query := `SELECT user_id, username, email, created_at, password_hash FROM chess.user WHERE username=$1;`

	rows, err := repo.dbPool.Query(ctx, query, username)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	user, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.User])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if !includeCredentials {
		user.PasswordHash = ""
	}

	return &user, nil
}
