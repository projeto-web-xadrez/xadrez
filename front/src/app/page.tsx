'use client';

import { useRef, useState } from "react";
import BoardComponent from './components/BoardComponent';
import { Chess, Square } from 'chess.js'

export default function Home() {

  const socketRef = useRef<WebSocket>(null!)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameState, setGameState] = useState<any>({
    'fen': 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  });
  const chessBoard = useRef<Chess>(new Chess(gameState.game_fen));

  const startGame = (playerId: string) => {
    if (socketRef.current && ![WebSocket.CLOSED, WebSocket.CLOSING as number].includes(socketRef.current.readyState))
      socketRef.current.close();
    socketRef.current = new WebSocket("ws://localhost:8082/ws");

    socketRef.current.onmessage = e => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'welcome') {
        const gameState = JSON.parse(msg.data);
        setGameState(gameState);
        chessBoard.current = new Chess(gameState.game_fen)
      } else if (msg.type === 'game_started') alert("game started")
      else if (msg.type === 'game_ended') alert(`game ended, winner: ${JSON.parse(msg.data).winner_id}`)
      else if (msg.type === 'player_moved') {
        const data = JSON.parse(msg.data);

        chessBoard.current.move({
          from: data.move_s1,
          to: data.move_s2
        })

        setGameState((prev: any) => ({
          ...prev,
          last_move_s1: data.move_s1,
          last_move_s2: data.move_s2,
          fen: chessBoard.current.fen()
        }));
      }
    }

    socketRef.current.onerror = e => console.error(`Error: ${e}`);
    socketRef.current.onopen = () => {
      setIsPlaying(true);
      socketRef.current.send(JSON.stringify(
        {
          "type": "init",
          "data": JSON.stringify({
            "room_id": "",
            "player_id": playerId
          })
        }
      ))
    }

    socketRef.current.onclose = () => console.log("socket closed")
  }

  const sendMove = (s1: Square, s2: Square, move: string) => {
    chessBoard.current.move({
      from: s1,
      to: s2
    });

    setGameState((prev: any) => ({
      ...prev,
      last_move_s1: s1,
      last_move_s2: s2,
      fen: chessBoard.current.fen()
    }))

    socketRef.current.send(JSON.stringify({
      'type': 'player_moved', 'data': JSON.stringify({
        'move_s1': s1,
        'move_s2': s2,
        'move_notation': move
      })
    }));

  }

  return (
    <div className="main">

      {!isPlaying ? (
        <>
          <button id="request-game" onClick={() => setIsPlaying(true)}>Request match</button>
          <button onClick={() => startGame(`CLIENT 1`)}> Join as P1</button>
          <button onClick={() => startGame(`CLIENT 2`)}> Join as P2</button>
        </>
      ) : (
        <BoardComponent
          chessBoard={chessBoard}
          gameState={gameState}
          sendMove={sendMove}
        />
      )}
    </div>
  );
}
