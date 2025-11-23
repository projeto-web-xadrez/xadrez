import { useEffect, useRef, useState } from 'react';
import { Chess, type Move } from 'chess.js';
import { useAuth } from '../context/AuthContext';
import { useWebsocket } from '../context/WebSocketContext';
// Components
import BoardComponent from '../components/BoardComponent';
import GameEndedComponent from '../components/GameEndedComponent';
import SoundPlayerComponent, { type SoundPlayerHandle } from '../components/SoundPlayerComponent';

export default function Home() {
  const playerId = localStorage.getItem("clientId") || "null";
  const soundRef = useRef<SoundPlayerHandle>(null);
  const socketRef = useRef<WebSocket>(null!)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const { isAuthenticated, clientId } = useAuth();
  const { isConnected, sendMessage, subscribe, unsubscribe } = useWebsocket()

  const [gameState, setGameState] = useState<any>({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  });

  const chessBoard = useRef<Chess>(new Chess(gameState.game_fen));

  useEffect(() => {
    if (!isAuthenticated) return;
    console.log("User ID:", clientId);
  }, [isAuthenticated]);

  if (!isAuthenticated)
    return null;

  const startGame = (playerId: string, roomId: string) => {
    if (socketRef.current && ![WebSocket.CLOSED, WebSocket.CLOSING as number].includes(socketRef.current.readyState) || playerId == "null")
      socketRef.current.close();
    socketRef.current = new WebSocket('ws://localhost:8082/ws');

    socketRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      console.log(msg)
      switch (msg.type) {
        case 'welcome': {
          const gameState = JSON.parse(msg.data);
          setGameState(gameState);
          chessBoard.current = new Chess(gameState.game_fen);
          break;
        }

        case 'game_ended': {
          const winner = JSON.parse(msg.data).winner_id
          setWinner(winner);
          setGameEnded(true);
          soundRef.current?.playSound('sounds/GameEnd.mp3');
          break;
        }

        case 'game_started': {
          alert("game_started")
          break;
        }

        case 'player_moved': {
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

          const soundFile = move.isCapture() ? 'sounds/Capture.mp3' : 'sounds/Move.mp3';
          soundRef.current?.playSound(soundFile);
          break;
        }

        default: break;
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

  const startGameRef = useRef(startGame);
  startGameRef.current = startGame;

  const requestMatch = () => {
    const ok = sendMessage("requestMatch", { id: playerId });

    if (!ok) return;

    subscribe("matchFound", (data) => {
      unsubscribe("matchFound"); // evita múltiplas execuções
      startGameRef.current(playerId, data.roomId);
    });
  };


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
          <button disabled={!isConnected} onClick={() => requestMatch()}>Request Match</button>
        </>
      ) : (
        <>
          {!gameEnded ? (
            <>
              <SoundPlayerComponent minDelayBetweenSounds={50} ref={soundRef} />
              <BoardComponent
                chessBoard={chessBoard}
                gameState={gameState}
                sendMove={sendMove}
              />

              <button onClick={sendInvalidMove}>
                Finalizar Partida com move invalido
              </button>
            </>
          ) : (
            <GameEndedComponent
              playerId={localStorage.getItem("clientId") || ""}
              winner={winner || ""}
              setIsPlaying={setIsPlaying}
              setGameEnded={setGameEnded}
              setWinner={setWinner}
            />
          )}
        </>
      )}
    </div>

  );
}
