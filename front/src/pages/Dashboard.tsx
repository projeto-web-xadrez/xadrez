'use client';

import Cookies from 'js-cookie';
import { useEffect, useRef, useState } from 'react';
import BoardComponent from '../components/BoardComponent';
import GameEndedComponent from '../components/GameEndedComponent';
import { Chess, type Square, Move } from 'chess.js';
import SoundPlayerComponent, { type SoundPlayerHandle } from '../components/SoundPlayerComponent';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const [isAuthenticated, setAuthenticated] = useState(false);
  const soundRef = useRef<SoundPlayerHandle>(null);
  const socketRef = useRef<WebSocket>(null!)
  const ApiSocketRef = useRef<WebSocket>(null!)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const [gameState, setGameState] = useState<any>({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  });

  const chessBoard = useRef<Chess>(new Chess(gameState.game_fen));

  useEffect(() => {
    const csrf = Cookies.get('csrf_token');
    if(!csrf) {
      navigate('/login');
      return
    }

    setAuthenticated(true);
  }, [isAuthenticated])

  if (!isAuthenticated)
    return null;
  
  const startGame = (playerId: string, roomId: string) => {
    if (socketRef.current && ![WebSocket.CLOSED, WebSocket.CLOSING as number].includes(socketRef.current.readyState) || playerId == "null")
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
        console.log(msg)
        soundRef.current?.playSound('sounds/GameEnd.mp3');
        setIsPlaying(false)
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

    socketRef.current.onerror = e => console.error(`[GAME-SERVER] Error: ${e}`);
    socketRef.current.onopen = () => {
      setIsPlaying(true);
      socketRef.current.send(JSON.stringify(
        {
          'type': 'init',
          'data': JSON.stringify({
            'room_id': roomId,
            'player_id': playerId
          })
        }
      ))
    }

    socketRef.current.onclose = () => console.log('[GAME-SERVER] Socket closed');
  }

  const requestMatch = () => {
    const playerId = localStorage.getItem("clientId") || "null";
    console.log(playerId)
    if (ApiSocketRef.current && ![WebSocket.CLOSED, WebSocket.CLOSING as number].includes(ApiSocketRef.current.readyState) || playerId == "null") {
        ApiSocketRef.current.close();
        console.log("[XADREZ-API] Fechando conexao")
    }
      
    ApiSocketRef.current = new WebSocket('ws://localhost:8080/ws');

    ApiSocketRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      console.log(e)
      console.log(msg)
      if (msg.type === 'matchFound') {
        console.log("Partida encontrada, conectando a sala " + msg.data.roomId)
        startGame(playerId, msg.data.roomId)
      } 
    }

    ApiSocketRef.current.onerror = e => console.error(`Error: ${e}`);
    ApiSocketRef.current.onopen = () => {
      ApiSocketRef.current.send(JSON.stringify(
        {
          'type': 'requestMatch',
          'data': {
            'id': playerId
          }
        }
      ))
    }

    ApiSocketRef.current.onclose = () => console.log('[XADREZ-API] Socket Closed');
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


  function sendInvalidMove() {
    console.log("mandando mov invalido para o servidor")
    socketRef.current.send(JSON.stringify({
      'type': 'player_moved', 'data': JSON.stringify({
        'move_s1': "eee2",
        'move_s2': "eee4",
        'move_notation': "lixo"
      })
    }));
  }

  return (
    <div className='main'>

      {!isPlaying && isAuthenticated ? (
        <>

          {/* <button onClick={() => startGame(`CLIENT 1`)}> Join as P1</button>
          <button onClick={() => startGame(`CLIENT 2`)}> Join as P2</button> */}
          <button onClick={() => requestMatch()}>Request Match</button>
        </>
      ) : (
        <>
          <SoundPlayerComponent minDelayBetweenSounds={50} ref={soundRef} />
          <BoardComponent
            chessBoard={chessBoard}
            gameState={gameState}
            sendMove={sendMove}
          />

          <button onClick={sendInvalidMove}>Finalizar Partida com move invalido</button>
        </>
      )}
      
    </div> 
  );
}
