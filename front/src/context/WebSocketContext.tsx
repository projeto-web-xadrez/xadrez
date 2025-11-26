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
    const { isAuthenticated, checkValidToken } = useAuth(); // supondo user.id
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
        const pingInterval = setInterval(() => {
            if (ws?.current) {
                ws?.current?.send(JSON.stringify({ "type": "ping", "data": { "ping": "ping" } }))
            }
        }, 15 * 1000);

        if (isAuthenticated) {
            ws.current = new WebSocket(`ws://localhost:80/api/ws?csrfToken=${localStorage.getItem('csrf_token')}`);

            ws.current.onopen = () => setConnected(true);
            ws.current.onerror = (err) => {
                console.log("[WS-API] ERROR", err);
            }
            ws.current.onclose = async (event) => {
                console.log(event.code + event.reason)
                console.log("[WS-API] Servidor foi finalizado. ")
                setConnected(false);

                // TODO: lidar com o token sendo invalidado no meio da acao
                checkValidToken()
            }

            ws.current.onmessage = (event) => {
                const rawData = JSON.parse(event.data)
                const dataType = rawData.type
                const data = rawData.data

                if (channels.current?.[dataType]) channels.current[dataType](data)

            };

        }

        // cleanup ao deslogar ou desmontar componente
        return () => {
            if (ws && ws?.current?.readyState !== WebSocket.CLOSING
                && ws?.current?.readyState !== WebSocket.CLOSED
            ) ws?.current?.close();

            //socket.current = null
            clearInterval(pingInterval)
            setConnected(false);
        };
    }, [isAuthenticated]);

    function sendMessage(type: string, data: any): boolean {
        if (!ws || ws.current.readyState !== WebSocket.OPEN) return false;
        try {
            ws.current?.send(JSON.stringify({ type, data }));
        } catch (err) {
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
