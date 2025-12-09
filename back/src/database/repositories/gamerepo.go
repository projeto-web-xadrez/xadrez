package repositories

import (
	"context"
	"database/models"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GameRepo struct {
	dbPool *pgxpool.Pool
}

func NewGameRepo(dbPool *pgxpool.Pool) *GameRepo {
	return &GameRepo{
		dbPool: dbPool,
	}
}

func (repo *GameRepo) GetGame(ctx context.Context, gameID uuid.UUID) (*models.Game, error) {
	query := `SELECT * FROM chess.game WHERE game_id=$1;`

	rows, err := repo.dbPool.Query(ctx, query, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	game, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Game])
	if err != nil {
		return nil, err
	}

	return &game, nil
}

func (repo *GameRepo) GetGamesFromUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.Game, error) {
	query := `SELECT * FROM chess.game WHERE white_id=$1 or white_id=$2 LIMIT $2;`

	rows, err := repo.dbPool.Query(ctx, query, userID.String(), limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	games, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.Game])
	if err != nil {
		return nil, err
	}

	return games, nil
}

func (repo *GameRepo) UpdateGame(ctx context.Context, game *models.Game) error {
	query := `UPDATE chess.game SET white_id=$2, black_id=$3, pgn=$4, status=$5, result=$6, last_fen=$7, started_at=$8, ended_at=$9 WHERE game_id=$1 RETURNING *;`

	_, err := repo.dbPool.Exec(ctx, query, game.ID, game.WhiteID, game.BlackID, game.PGN, game.Status, game.Result, game.LastFEN, game.StartedAt, game.EndedAt)
	if err != nil {
		return err
	}

	return nil
}

func (repo *GameRepo) CreateNewGame(ctx context.Context, gameID uuid.UUID, whiteID uuid.UUID, blackID uuid.UUID, pgn string, status string, result string, lastFen string, startedAt time.Time, endedAt time.Time) (*models.Game, error) {
	query := `INSERT INTO chess.game(game_id, white_id, black_id, pgn, status, result, last_fen, started_at, ended_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;`

	rows, err := repo.dbPool.Query(ctx, query, gameID, whiteID, blackID, pgn, status, result, lastFen, startedAt, endedAt)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	game, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Game])
	if err != nil {
		return nil, err
	}

	return &game, nil
}
