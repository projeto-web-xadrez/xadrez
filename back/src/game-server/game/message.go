package game

type Message struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

type InitMessage struct {
	RoomID string `json:"room_id"`
}

type WelcomeContextMessage struct {
	RoomID          string `json:"room_id"`
	Player1ID       string `json:"player1_id"`
	Player1Username string `json:"player1_username"`
	Player2ID       string `json:"player2_id"`
	Player2Username string `json:"player2_username"`
	GameFEN         string `json:"game_fen"`
	GamePGN         string `json:"game_pgn"`
	LastMoveS1      string `json:"last_move_s1"`
	LastMoveS2      string `json:"last_move_s2"`
	GameStatus      string `json:"game_status"`
	Winner          string `json:"winner_id"`
}

type GameStartedMessage struct{}
type GameEndedMessage struct {
	Winner string `json:"winner_id"`
}

type PlayerMovedMessage struct {
	MoveS1       string `json:"move_s1"`
	MoveS2       string `json:"move_s2"`
	MoveNotation string `json:"move_notation"`
}
