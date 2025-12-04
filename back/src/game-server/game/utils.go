package game

import "github.com/corentings/chess/v2"

func convertSquare(squareStr string) *chess.Square {
	if len(squareStr) != 2 {
		return nil
	}
	if squareStr[0] < 'a' || squareStr[0] > 'h' {
		return nil
	}
	if squareStr[1] < '1' || squareStr[1] > '8' {
		return nil
	}
	square := chess.NewSquare(chess.File(squareStr[0]-'a'), chess.Rank(squareStr[1]-'1'))
	return &square
}

func newQuitMessage(reason string) Message {
	return Message{
		Type: "quit",
		Data: reason,
	}
}
