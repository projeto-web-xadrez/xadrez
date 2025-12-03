package gamelogic

import (
	"context"
	"database/repositories"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"proto-generated/auth_grpc"
	"sync"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var userRepo *repositories.UserRepo

func SetUserRepo(repo *repositories.UserRepo) {
	userRepo = repo
}

var rooms map[uuid.UUID]*Room = make(map[uuid.UUID]*Room)
var roomsMutex sync.RWMutex = sync.RWMutex{}

var players map[uuid.UUID]*Player = make(map[uuid.UUID]*Player)
var playersMutex sync.RWMutex = sync.RWMutex{}

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

func getRoom(roomID uuid.UUID) *Room {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	return rooms[roomID]
}

func getPlayer(playerID uuid.UUID) *Player {
	playersMutex.Lock()
	defer playersMutex.Unlock()
	return players[playerID]
}

func HandleNewClient(ws *websocket.Conn, session *auth_grpc.Session) {
	shouldCloseWS := true
	defer func() {
		if shouldCloseWS {
			ws.Close()
		}
	}()

	var msg Message
	err := ws.ReadJSON(&msg)
	if err != nil || msg.Type != "init" {
		if err != nil {
			fmt.Printf("%v\n", err)
		}

		println("Mensagem inicial diferente de init ou erro identificado")
		return
	}

	var initMsg InitMessage
	err = json.Unmarshal([]byte(msg.Data), &initMsg)
	if err != nil {
		return
	}

	playerId := uuid.MustParse(session.UserId)
	player := getPlayer(playerId)
	if player == nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		user, err := userRepo.GetUserByID(ctx, playerId, false)
		if err != nil {
			return
		}

		trashChannel := make(chan Message, 100)

		player = &Player{
			ID:        playerId,
			Connected: false,
			Room:      nil,
			Mutex:     sync.RWMutex{},
			Color:     chess.NoColor,
			WSSend:    &trashChannel,
			User:      user,
			Type:      "spectator",
		}
	}

	player.Mutex.Lock()
	// Envia para o canal referenciado no ponteiro uma mensagem para se desconectar.
	// Se tiver apenas uma aba, esse canal é nulo, caso haja duas, o primeiro conectado
	// receberá um sinal para desconectar o front
	(*player.WSSend) <- Message{
		Type: "quit",
		Data: "redundantConnection",
	}

	playingRoom := player.Room
	if playingRoom == nil {
		player.Color = chess.NoColor
		player.Type = "spectator"

		roomId, err := uuid.Parse(initMsg.RoomID)
		if err != nil {
			ws.Close()
			player.Connection = nil
			player.Mutex.Unlock()
			return
		}

		roomsMutex.Lock()
		room, ok := rooms[roomId]
		roomsMutex.Unlock()

		if !ok {
			ws.Close()
			player.Connection = nil
			player.Mutex.Unlock()
			return
		}
		playingRoom = room
	}

	player.Connected = true
	player.Connection = ws
	player.LastConnection = time.Now()

	WSSend := make(chan Message, 100)
	player.WSSend = &WSSend
	go func() {
		for {
			msg := <-WSSend

			if msg.Type == "quit" {
				ws.Close()
				return
			}

			err := ws.WriteJSON(msg)
			if err != nil {
				player.Mutex.Lock()
				defer player.Mutex.Unlock()
				if ws != player.Connection {
					return
				}

				player.Connected = false
				ws.Close()
				return
			}
		}
	}()

	player.Mutex.Unlock()

	spectating := false
	roomPlayers := playingRoom.Players
	var opponent *Player
	if playingRoom.Players[0].ID == player.ID {
		opponent = playingRoom.Players[1]
	} else if playingRoom.Players[1].ID == player.ID {
		opponent = playingRoom.Players[0]
	} else {
		spectating = true
		playingRoom.Mutex.Lock()
		playingRoom.Spectators[playerId] = player
		playingRoom.Mutex.Unlock()
	}

	defer func() {
		if spectating {
			return
		}

		player.Mutex.Lock()
		player.Connected = false
		WSSend <- Message{
			Type: "quit",
			Data: "",
		}
		player.Connection = nil
		player.Mutex.Unlock()

		playingRoom.Mutex.Lock()
		if playingRoom.Status == GameEnded {
			time.Sleep(2 * time.Second)
			*opponent.WSSend <- Message{
				Type: "quit",
				Data: "GameEnded",
			}

			for _, spec := range playingRoom.Spectators {
				if spec != nil && spec.WSSend != nil {
					(*spec.WSSend) <- Message{
						Type: "quit",
						Data: "GameEnded",
					}
				}
			}

			time.Sleep(1 * time.Second)

			playersMutex.Lock()
			delete(players, player.ID)
			delete(players, opponent.ID)
			playersMutex.Unlock()

			roomsMutex.Lock()
			delete(rooms, playingRoom.RoomID)
			roomsMutex.Unlock()
		}
		playingRoom.Mutex.Unlock()
	}()

	playingRoom.Mutex.Lock()

	welcomeMessage := WelcomeContextMessage{
		RoomID:          playingRoom.RoomID.String(),
		Color:           player.Color.String(),
		Player1ID:       roomPlayers[0].ID.String(),
		Player1Username: roomPlayers[0].User.Username,
		Player2ID:       roomPlayers[1].ID.String(),
		Player2Username: roomPlayers[1].User.Username,
		GamePGN:         playingRoom.Game.String(),
		GameFEN:         playingRoom.Game.FEN(),
		LastMoveS1:      playingRoom.LastMoveS1.String(),
		LastMoveS2:      playingRoom.LastMoveS2.String(),
		GameStatus:      playingRoom.Status.String(),
		Winner:          playingRoom.Winner,
	}

	playingRoom.Mutex.Unlock()

	jsonData, _ := json.Marshal(welcomeMessage)
	WSSend <- Message{
		Type: "welcome",
		Data: string(jsonData),
	}

	playingRoom.Mutex.Lock()
	if playingRoom.Status == GameEnded {
		playingRoom.Mutex.Unlock()

		if spectating {
			player.Mutex.Lock()
			player.Connected = false
			if player.WSSend != nil {
				player.Mutex.Unlock()
				(*player.WSSend) <- Message{
					Type: "quit",
					Data: "GameEnded",
				}
			} else {
				player.Mutex.Unlock()
			}
		}

		return
	}

	if spectating {
		shouldCloseWS = false // Connection will be kept up for receiving moves
		playingRoom.Mutex.Unlock()
		return
	}

	if playingRoom.Status == WaitingPlayers {
		opponent.Mutex.RLock()
		both_connected := !opponent.LastConnection.IsZero()
		opponent.Mutex.RUnlock()

		if both_connected {
			playingRoom.Status = GameStarted
			*opponent.WSSend <- Message{
				Type: "game_started",
				Data: "",
			}

			WSSend <- Message{
				Type: "game_started",
				Data: "",
			}

			for _, spec := range playingRoom.Spectators {
				if spec != nil && spec.WSSend != nil {
					(*spec.WSSend) <- Message{
						Type: "game_started",
						Data: "",
					}
				}
			}
		}
	}

	var whitePlayer, blackPlayer *Player
	if playingRoom.Players[0].Color == chess.White {
		whitePlayer = playingRoom.Players[0]
		blackPlayer = playingRoom.Players[1]
	} else {
		whitePlayer = playingRoom.Players[1]
		blackPlayer = playingRoom.Players[0]
	}

	playingRoom.Mutex.Unlock()

	opponentWin := func() {
		playingRoom.Mutex.Lock()
		playingRoom.Status = GameEnded
		playingRoom.Winner = opponent.ID.String()

		gameEndMessage := GameEndedMessage{
			Winner: playingRoom.Winner,
		}

		jsonData, _ := json.Marshal(gameEndMessage)
		msg = Message{
			Type: "game_ended",
			Data: string(jsonData),
		}
		*opponent.WSSend <- msg
		WSSend <- msg
		for _, spec := range playingRoom.Spectators {
			if spec != nil && spec.WSSend != nil {
				(*spec.WSSend) <- Message{
					Type: "game_ended",
					Data: string(jsonData),
				}
			}
		}

		playingRoom.Mutex.Unlock()
		// Wait 2 seconds so the message can reach the player
		time.Sleep(2 * time.Second)
	}

	for {
		err = ws.ReadJSON(&msg)
		if err != nil {
			var jsonErr *json.SyntaxError
			if errors.As(err, &jsonErr) {
				opponentWin() // Invalid message, opponent must win
			}
			ws.Close()
			return
		}
		switch msg.Type {
		case "player_moved":
			var moveMsg PlayerMovedMessage
			err = json.Unmarshal([]byte(msg.Data), &moveMsg)
			if err != nil || playingRoom.Status != GameStarted {
				if playingRoom.Status != GameEnded {
					opponentWin() // Malformed message, opponent must win
				}
				return
			}

			if len(moveMsg.MoveS1) != 2 || len(moveMsg.MoveS2) != 2 {
				opponentWin() // Malformed move, opponent must win
				time.Sleep(2 * time.Second)
				return
			}

			s1 := convertSquare(moveMsg.MoveS1)
			s2 := convertSquare(moveMsg.MoveS2)
			if s1 == nil || s2 == nil {
				opponentWin() // Malformed squares, opponent must win
				return
			}

			playingRoom.Mutex.Lock()

			if playingRoom.Game.CurrentPosition().Turn() != player.Color {
				opponentWin() // Not his turn, opponent must win
				return
			}

			//room.Game.ValidMoves() Not sure why this was here, I'm commenting it anyway

			err = playingRoom.Game.PushNotationMove(moveMsg.MoveNotation, chess.AlgebraicNotation{}, nil)
			if err != nil {
				opponentWin() // Invalid move, opponent must win
				return
			}

			playingRoom.LastMoveS1 = *s1
			playingRoom.LastMoveS2 = *s2

			outcome := playingRoom.Game.Outcome()
			if outcome != chess.NoOutcome {
				switch outcome {
				case chess.Draw:
					playingRoom.Winner = "draw"
				case chess.BlackWon:
					playingRoom.Winner = blackPlayer.ID.String()
				case chess.WhiteWon:
					playingRoom.Winner = whitePlayer.ID.String()
				case chess.UnknownOutcome:
					fmt.Println(playingRoom.Game)
					fmt.Println(playingRoom.Game.FEN())
					panic("We got an unknown outcome")
				}

				gameEndMessage := GameEndedMessage{
					Winner: playingRoom.Winner,
				}
				jsonData, _ := json.Marshal(gameEndMessage)
				winMsg := Message{
					Type: "game_ended",
					Data: string(jsonData),
				}

				*opponent.WSSend <- msg
				*opponent.WSSend <- winMsg
				WSSend <- winMsg

				for _, spec := range playingRoom.Spectators {
					if spec != nil && spec.WSSend != nil {
						(*spec.WSSend) <- msg
						(*spec.WSSend) <- winMsg
					}
				}

				playingRoom.Status = GameEnded

				playingRoom.Mutex.Unlock()
				// Wait 2 seconds so the message can reach the player
				time.Sleep(2 * time.Second)
				return
			}

			*opponent.WSSend <- msg
			for _, spec := range playingRoom.Spectators {
				if spec != nil && spec.WSSend != nil {
					(*spec.WSSend) <- msg
				}
			}
			playingRoom.Mutex.Unlock()
		}
	}
}

func CreateNewRoom(playerID1 uuid.UUID, playerID2 uuid.UUID) (*Room, error) {
	p1 := getPlayer(playerID1)
	p2 := getPlayer(playerID2)

	if p1 != nil && p1.Room != nil {
		return nil, errors.New("Player 1 is already in a room")
	}

	if p2 != nil && p2.Room != nil {
		return nil, errors.New("Player 2 is already in a room")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	user1, err := userRepo.GetUserByID(ctx, playerID1, false)
	if err != nil {
		return nil, err
	}

	user2, err := userRepo.GetUserByID(ctx, playerID1, false)
	if err != nil {
		return nil, err
	}

	room := &Room{
		Mutex:      sync.RWMutex{},
		RoomID:     uuid.New(),
		Players:    [2]*Player{},
		Status:     WaitingPlayers,
		Game:       chess.NewGame(),
		Spectators: make(map[uuid.UUID]*Player),
	}
	room.Mutex.Lock()

	roomsMutex.Lock()
	rooms[room.RoomID] = room
	roomsMutex.Unlock()

	var p1Color, p2Color chess.Color
	if rand.Intn(2) == 1 {
		p1Color = chess.White
		p2Color = chess.Black
	} else {
		p1Color = chess.Black
		p2Color = chess.White
	}

	if p1 != nil {
		p1.Mutex.Lock()
		if p1.WSSend != nil {
			(*p1.WSSend) <- Message{
				Type: "quit",
				Data: "NewGameStarted: " + room.RoomID.String(),
			}
		}
		p1.Mutex.Unlock()
	}

	if p2 != nil {
		p2.Mutex.Lock()
		if p2.WSSend != nil {
			(*p2.WSSend) <- Message{
				Type: "quit",
				Data: "NewGameStarted: " + room.RoomID.String(),
			}
		}
		p2.Mutex.Unlock()
	}

	trash_channel := make(chan Message, 100)
	p1 = &Player{
		ID:        playerID1,
		Connected: false,
		Room:      room,
		Mutex:     sync.RWMutex{},
		Color:     p1Color,
		WSSend:    &trash_channel,
		User:      user1,
		Type:      "player",
	}

	p2 = &Player{
		ID:        playerID2,
		Connected: false,
		Room:      room,
		Mutex:     sync.RWMutex{},
		Color:     p2Color,
		WSSend:    &trash_channel,
		User:      user2,
		Type:      "player",
	}

	room.Players[0] = p1
	room.Players[1] = p2

	playersMutex.Lock()
	players[playerID1] = p1
	players[playerID2] = p2
	playersMutex.Unlock()

	room.Mutex.Unlock()

	return room, nil
}
