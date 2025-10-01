package gamelogic

type Message struct {
	Type string
	Data string
}

type InitMessage struct {
	PlayerId string
	RoomId   string
}

type WelcomeContextMessage struct {
	RoomId      string
	Color       uint8
	EnemyId     string
	GameFEN     string
	LastMoveS1  string
	LastMoveS2  string
	GameStarted bool
	GameEnded   bool
	WinnerId    string
}

type GameStartedMessage struct{}
type GameEndedMessage struct {
	WinnerId string
}

type PlayerMoved struct {
	MoveS1 string
	MoveS2 string
	Move   string
}
