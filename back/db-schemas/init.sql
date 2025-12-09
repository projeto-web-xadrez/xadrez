CREATE SCHEMA IF NOT EXISTS chess;
CREATE EXTENSION IF NOT EXISTS citext;


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


CREATE TABLE IF NOT EXISTS chess.user_stats(
    user_id UUID PRIMARY KEY REFERENCES chess.user(user_id),
    wins INT DEFAULT 0,
    draws INT DEFAULT 0,
    losses INT DEFAULT 0,
    games_played INT DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION init_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO chess.user_stats(user_id) VALUES (NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER user_created
AFTER INSERT ON chess.user
FOR EACH ROW
EXECUTE FUNCTION init_user_stats();

CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.result != 'in_progress' AND OLD.result = 'in_progress' THEN
        UPDATE chess.user_stats us
        SET
            games_played = games_played + 1,
            wins = wins + CASE WHEN NEW.result = 'white' THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.result = 'black' THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
            last_updated = NOW()
        WHERE us.user_id = NEW.white_id;

        UPDATE chess.user_stats us
        SET
            games_played = games_played + 1,
            wins = wins + CASE WHEN NEW.result = 'black' THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.result = 'white' THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
            last_updated = NOW()
        WHERE us.user_id = NEW.black_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER game_result_update
AFTER UPDATE ON chess.game
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

CREATE TABLE IF NOT EXISTS chess.saved_game(
    game_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    pgn TEXT NOT NULL,
    last_fen TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES chess.user(user_id)
);