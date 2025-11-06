CREATE SCHEMA IF NOT EXISTS chess;

/*
DROP TABLE IF EXISTS chess.game;
DROP TABLE IF EXISTS chess.user;
DROP TYPE IF EXISTS chess.game_result;
DROP TYPE IF EXISTS chess.game_result_reason;
DROP TYPE IF EXISTS chess.game_category;
*/

CREATE TYPE chess.game_result AS ENUM('white_won', 'black_won', 'draw', 'aborted');
CREATE TYPE chess.game_result_reason AS ENUM('win_checkmate', 'win_resignation',
    'win_timeout', 'draw_agreement', 'draw_stalemate', 'draw_threefold_repetition',
    'draw_timeout_insufficient_material', 'draw_insufficient_material', 'draw_50_moves');
CREATE TYPE chess.game_category AS ENUM('bullet', 'blitz', 'rapid');

CREATE TABLE IF NOT EXISTS chess.user(
    user_id UUID PRIMARY KEY,
    username VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(320) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    password_hash VARCHAR(320) NOT NULL
);

CREATE TABLE IF NOT EXISTS chess.game(
    game_id UUID PRIMARY KEY,
    category chess.game_category NOT NULL,
    time_control VARCHAR(10) NOT NULL,
    white_id UUID NOT NULL REFERENCES chess.user(user_id),
    black_id UUID NOT NULL REFERENCES chess.user(user_id),
    pgn TEXT NOT NULL,
    result chess.game_result NOT NULL,
    result_reason chess.game_result_reason NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL
);