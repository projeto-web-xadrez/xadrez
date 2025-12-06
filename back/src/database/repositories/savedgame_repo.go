package repositories

import (
	"context"
	"database/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SavedGameRepo struct {
	dbPool *pgxpool.Pool
}

func NewSavedGame(dbPool *pgxpool.Pool) *UserRepo {
	return &UserRepo{
		dbPool: dbPool,
	}
}

func (repo *SavedGameRepo) GetGame(ctx context.Context, gameID uuid.UUID) (*models.SavedGame, error) {
	query := `SELECT * FROM chess.saved_games WHERE game_id=$1;`

	rows, err := repo.dbPool.Query(ctx, query, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	savedGame, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.SavedGame])
	if err != nil {
		return nil, err
	}

	return &savedGame, nil
}

func (repo *SavedGameRepo) GetGamesFromUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.SavedGame, error) {
	query := `SELECT * FROM chess.saved_games WHERE user_id=$1 LIMIT=$2;`

	rows, err := repo.dbPool.Query(ctx, query, userID.String(), limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	savedGames, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.SavedGame])
	if err != nil {
		return nil, err
	}

	return savedGames, nil
}

func (repo *SavedGameRepo) UpdateGame(ctx context.Context, savedGame *models.SavedGame) error {
	query := `UPDATE chess.saved_games SET name=$2, pgn=$3, last_fen=$4 WHERE game_id = $1 RETURNING *;`

	rows, err := repo.dbPool.Query(ctx, query, savedGame.ID, savedGame.Name, savedGame.PGN, savedGame.LastFEN)
	if err != nil {
		return err
	}
	defer rows.Close()

	newModel, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.SavedGame])
	if err != nil {
		return err
	}

	savedGame.Name = newModel.Name
	savedGame.PGN = newModel.PGN
	savedGame.CreatedAt = newModel.CreatedAt

	return nil
}

func (repo *SavedGameRepo) CreateNewGame(ctx context.Context, userID uuid.UUID, name string, pgn string, lastFEN string) (*models.SavedGame, error) {
	query := `INSERT INTO chess.saved_games(user_id, name, pgn, last_fen) VALUES ($1, $2, $3, $4) RETURNING *;`

	rows, err := repo.dbPool.Query(ctx, query, userID, name, pgn, lastFEN)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	savedGame, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.SavedGame])
	if err != nil {
		return nil, err
	}

	return &savedGame, nil
}

func (repo *SavedGameRepo) DeleteGame(ctx context.Context, gameID uuid.UUID) (bool, error) {
	query := `DELETE FROM chess.saved_games WHERE game_id = $1;`

	cmdTag, err := repo.dbPool.Exec(ctx, query, gameID)
	if err != nil {
		return false, err
	}

	return (cmdTag.RowsAffected() > 0), nil
}
