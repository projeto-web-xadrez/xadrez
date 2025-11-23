import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth } from "./AuthContext";

type WebSocketContextType = {
    isConnected: boolean;
    sendMessage: (type: string, data: any) => boolean;
    subscribe: (channel: string, callback: (data: any) => void) => void;
    unsubscribe: (channel: string) => void;
};

export const WebSocketContext = createContext<WebSocketContextType>(null!);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth(); // supondo user.id
    const [isConnected, setConnected] = useState(false);
    const ws = useRef<WebSocket>(null!)

    // Canal onde os componentes vao poder subscribe para tipos especificos de algumas mensagens
    const channels = useRef<Record<string, (data: any) => void>>({})

    const subscribe = (channel: string, callback: (data: any) => void) => {
        channels.current[channel] = callback
    }

    const unsubscribe = (channel: string) => {
        delete channels.current[channel]
    }

    useEffect(() => {
        if (isAuthenticated) {
            ws.current = new WebSocket("ws://localhost:8080/ws");

            ws.current.onopen = () => setConnected(true);
            ws.current.onerror = (err) => console.error("[WS] ERROR", err);
            ws.current.onclose = () => setConnected(false);

            ws.current.onmessage = (event) => {
                const rawData = JSON.parse(event.data)
                const dataType = rawData.type
                const data = rawData.data

                if (channels.current?.[dataType]) channels.current[dataType](data)
                
            };
        }

        // cleanup ao deslogar ou desmontar componente
        return () => {
            ws?.current.close();
            //socket.current = null
            setConnected(false);
        };
    }, [isAuthenticated]);

    function sendMessage(type: string, data: any): boolean {
        if (!ws || ws.current.readyState !== WebSocket.OPEN) return false;
        try {
            ws.current?.send(JSON.stringify({ type, data }));
        } catch(err) {
            return false
        }
        
        return true;
    }

    return (
        <WebSocketContext.Provider value={{ isConnected, sendMessage, subscribe, unsubscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebsocket() {
    return useContext(WebSocketContext);
}
