'use client';

import { useEffect, createContext, useRef, useState } from "react";
import BoardComponent from './components/BoardComponent';

export default function Home() {

  const socketRef = useRef<WebSocket>(null!)
  const [lastMsg, setLastMsg] = useState(JSON.stringify({"type": "test"}))

  useEffect(() => {
    // Criar socket só uma vez
    const socket = new WebSocket("ws://localhost:8080/ws");

    socket.onopen = () => {
      console.log("Conectado ao servidor!");
    };

    socket.onmessage = (event) => {
      console.log("Evento recebido: " + event.data);
      setLastMsg(event.data)
    };

    socket.onerror = (err) => {
      console.log("Erro no WebSocket:", err);
    };

    socket.onclose = () => {
      console.log("Conexão fechada!");
    };

    socketRef.current = socket

    // Cleanup: fechar conexão quando sair da página
    return () => {
      socket.close();
    };
  }, []);

  return (
    < BoardComponent wsRef={socketRef} lastMessage={lastMsg} />
  );
}
