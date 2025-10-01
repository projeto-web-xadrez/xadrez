package gamelogic

type Message struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

type InitMessage struct {
	PlayerID string `json:"player_id"`
	RoomID   string `json:"room_id"`
}

type WelcomeContextMessage struct {
	RoomID     string `json:"room_id"`
	Color      uint8  `json:"color"`
	OpponentID string `json:"opponent_id"`
	GameFEN    string `json:"game_fen"`
	LastMoveS1 string `json:"last_move_s1"`
	LastMoveS2 string `json:"last_move_s2"`
	GameStatus string `json:"game_status"`
	Winner     string `json:"winner_id"`
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
