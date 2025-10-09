'use client';

import { useRef, useState } from 'react';
import BoardComponent from '../components/BoardComponent';
import { Chess, Square, Move } from 'chess.js'
import SoundPlayerComponent, { SoundPlayerHandle } from '../components/SoundPlayerComponent';

export default function Home() {
  
  const soundRef = useRef<SoundPlayerHandle>(null);
  const socketRef = useRef<WebSocket>(null!)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameState, setGameState] = useState<any>({
    'fen': 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  });
  const chessBoard = useRef<Chess>(new Chess(gameState.game_fen));

  const startGame = (playerId: string) => {
    if (socketRef.current && ![WebSocket.CLOSED, WebSocket.CLOSING as number].includes(socketRef.current.readyState))
      socketRef.current.close();
    socketRef.current = new WebSocket('ws://localhost:8082/ws');

    socketRef.current.onmessage = e => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'welcome') {
        const gameState = JSON.parse(msg.data);
        setGameState(gameState);
        chessBoard.current = new Chess(gameState.game_fen)
      } else if (msg.type === 'game_started') alert('game started')
      else if (msg.type === 'game_ended') {
        soundRef.current?.playSound('sounds/GameEnd.mp3');
      }
      else if (msg.type === 'player_moved') {
        const data = JSON.parse(msg.data);

        const move = chessBoard.current.moves({
          verbose: true,
          square: data.move_s1
        }).find(m => m.san === data.move_notation) as Move;

        chessBoard.current.move(move);

        setGameState((prev: any) => ({
          ...prev,
          last_move_s1: data.move_s1,
          last_move_s2: data.move_s2,
          fen: chessBoard.current.fen()
        }));

        const soundFile = move.isCapture() ?
          'sounds/Capture.mp3' : 'sounds/Move.mp3';
        soundRef.current?.playSound(soundFile);
      }
    }

    socketRef.current.onerror = e => console.error(`Error: ${e}`);
    socketRef.current.onopen = () => {
      setIsPlaying(true);
      socketRef.current.send(JSON.stringify(
        {
          'type': 'init',
          'data': JSON.stringify({
            'room_id': '',
            'player_id': playerId
          })
        }
      ))
    }

    socketRef.current.onclose = () => console.log('socket closed');
  }

  const sendMove = (move: Move) => {
    chessBoard.current.move(move);

    setGameState((prev: any) => ({
      ...prev,
      last_move_s1: move.from,
      last_move_s2: move.to,
      fen: chessBoard.current.fen()
    }))

    socketRef.current.send(JSON.stringify({
      'type': 'player_moved', 'data': JSON.stringify({
        'move_s1': move.from,
        'move_s2': move.to,
        'move_notation': move.san
      })
    }));

    const soundFile = move.isCapture() ?
      'sounds/Capture.mp3' : 'sounds/Move.mp3';
    soundRef.current?.playSound(soundFile);
  }

  return (
    <div className='main'>

      {!isPlaying ? (
        <>

          <button onClick={() => startGame(`CLIENT 1`)}> Join as P1</button>
          <button onClick={() => startGame(`CLIENT 2`)}> Join as P2</button>
        </>
      ) : (
        <>
          <SoundPlayerComponent minDelayBetweenSounds={50} ref={soundRef} />
          <BoardComponent
            chessBoard={chessBoard}
            gameState={gameState}
            sendMove={sendMove}
          />
        </>
      )}
    </div> 
  );
}
