'use client';

import { useEffect, createContext, useRef, useState } from "react";
import BoardComponent from './components/BoardComponent';
import { Color } from "chess.js";

export default function Home() {

  const socketRef = useRef<WebSocket>(null!)
  const [isPlayerTurn, setPlayerTurn] = useState(false)
  const [playerColor, setPlayerColor] = useState<Color>("b")
  const [lastMsg, setLastMsg] = useState(JSON.stringify({ "type": "test" }))
  const [isPlaying, setIsPlaying] = useState(false)
  const [socketState, setSocketState] = useState("CONNECTING");

  const readyStateMap: Record<number, string> = {
    0: "CONNECTING",
    1: "OPEN",
    2: "CLOSING",
    3: "CLOSED",
  };

  useEffect(() => {
    // Criar socket só uma vez
    const socket = new WebSocket("ws://localhost:8082/ws");

    socket.onopen = () => {
      console.log("Conectado ao servidor!");
      // make a request to play the game
    };

    socket.onmessage = (event) => {
      console.log("Evento recebido: " + event.data);
      if (event.data.type == "moveValidation") {
        setLastMsg(event.data)
        setPlayerTurn(event.data.turn)
      }
      if (event.data.type == "startGame") {
        setPlayerColor(event.data.data.color)
        setPlayerTurn(event.data.data.turn)
        setIsPlaying(true)
      }

      if (event.data.type == "endGame") {
        setIsPlaying(false)
      }
    };

    socket.onerror = (err) => {
      console.log("Erro no WebSocket:", err);
    };

    socket.onclose = () => {
      console.log("Conexão fechada!");
    };

    socketRef.current = socket

    const interval = setInterval(() => {
      if (socketRef.current) {
        setSocketState(readyStateMap[socketRef.current.readyState]);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, []);

  return (
    <div className="main">

      {!isPlaying ? (
        <>
        <h1>{socketState} - Waiting for game to start</h1>
        <button id="request-game" hidden={isPlaying} onClick={() => setIsPlaying(true)}>Request match</button>
        </>
      ) : (
        <BoardComponent
          wsRef={socketRef}
          lastMessage={lastMsg}
          perspectiveColor={playerColor}
          isPlayerTurn={isPlayerTurn}
        />
      )}
    </div>
  );
}
