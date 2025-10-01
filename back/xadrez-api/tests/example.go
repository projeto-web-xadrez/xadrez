package main

import (
	"fmt"
	"math/rand"

	"github.com/corentings/chess/v2"
)

func main() {
	game := chess.NewGame()
	// generate moves until game is over
	for game.Outcome() == chess.NoOutcome {
		// select a random move
		moves := game.ValidMoves()
		move := moves[rand.Intn(len(moves))]
		if err := game.Move(&move, nil); err != nil {
			panic(err) // Should not happen with valid moves
		}
	}
	// print outcome and game PGN
	fmt.Println(game.Position().Board().Draw())
	fmt.Printf("Game completed. %s by %s.\n", game.Outcome(), game.Method())
	fmt.Println(game.String())
	/*
		Output:

		 A B C D E F G H
		8- - - - - - - -
		7- - - - - - ♚ -
		6- - - - ♗ - - -
		5- - - - - - - -
		4- - - - - - - -
		3♔ - - - - - - -
		2- - - - - - - -
		1- - - - - - - -

		Game completed. 1/2-1/2 by InsufficientMaterial.

		1.Nc3 b6 2.a4 e6 3.d4 Bb7 ...
	*/
}
