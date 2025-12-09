CREATE SCHEMA IF NOT EXISTS chess;
CREATE EXTENSION IF NOT EXISTS citext;

/*
DROP TABLE IF EXISTS chess.game;
DROP TABLE IF EXISTS chess.user;
DROP TYPE IF EXISTS chess.game_result;
DROP TYPE IF EXISTS chess.game_result_reason;
DROP TYPE IF EXISTS chess.game_category;
*/

CREATE TYPE chess.game_result AS ENUM('in_progress', 'white_won', 'black_won', 'draw', 'aborted');

CREATE TABLE IF NOT EXISTS chess.user(
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username citext UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chess.game(
    game_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    white_id UUID NOT NULL REFERENCES chess.user(user_id),
    black_id UUID NOT NULL REFERENCES chess.user(user_id),
    pgn TEXT DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'ended')),
    result TEXT NOT NULL CHECK (result IN ('in_progress', 'aborted', 'white', 'black', 'draw')),
    result_reason TEXT DEFAULT '',
    last_fen TEXT DEFAULT '',
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS chess.saved_game(
    game_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    pgn TEXT NOT NULL,
    last_fen TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES chess.user(user_id)
);