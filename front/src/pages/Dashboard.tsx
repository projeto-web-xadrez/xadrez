import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebsocket } from '../context/WebSocketContext';

export default function Dashboard() {
  const playerId = localStorage.getItem("clientId") || "null";
  const { isAuthenticated } = useAuth();
  const { sendMessage, subscribe, unsubscribe } = useWebsocket()
  const navigate = useNavigate();

  if (!isAuthenticated)
    return null;

  const requestMatch = () => {
    subscribe("matchFound", (data) => {
      const room = data['roomId'] as string;
      unsubscribe("matchFound"); // evita múltiplas execuções
      navigate(`/game/${room}`, {
        state: {
          liveGame: true
        }
      });
    });

    const ok = sendMessage("requestMatch", { id: playerId });
    if (!ok) {
      unsubscribe("matchFound");
      return;
    }
  };


  return (
    <div className='main'>
      <button onClick={requestMatch}> Request Match</button>
    </div>

  );
}
