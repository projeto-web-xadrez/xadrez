import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebsocket } from '../context/WebSocketContext';
import { useEffect, useState } from 'react';
import MatchSearchComponent from '../components/dashboard/MatchSearchComponent';
import "../styles/Dashboard.css"

interface UserStatsType {
  draws: number,
  games_played: number,
  last_updated: string,
  losses: number
  wins: number
}


export default function Dashboard() {
  const playerId = localStorage.getItem("clientId") || "null";
  const { isAuthenticated, clientId } = useAuth();
  const { sendMessage, subscribe, unsubscribe } = useWebsocket()
  const [isUserStatsLoaded, setUserStatsLoaded] = useState<boolean>(false)
  const [userStats, setUserStats] = useState<UserStatsType | undefined>(undefined)

  const navigate = useNavigate();


  if (!isAuthenticated)
    return null;

  useEffect(() => {
    fetchUserStats()
  }, [isAuthenticated])

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

    const ok = sendMessage("joinQueue", { id: playerId });
    if (!ok) {
      unsubscribe("matchFound");
      return;
    }
  }

  const handleCancel = () => {
    const ok = sendMessage("leaveQueue", {});
    if (!ok) {
      return;
    }
  };

  const fetchUserStats = async () => {
    await fetch(`api/userstats/${clientId}`, {
      method: "GET",
      credentials: "include",
    }).then(async (data: any) => {
      const jsonData = await data.json()
      const user_stats_updated: UserStatsType = jsonData.stats as UserStatsType;
      setUserStats(user_stats_updated)
      setUserStatsLoaded(true)
    }).catch((error) => console.log(error))

  }


  return (
    <div className='main'>
      <div className="dashboard-card-container">
        <div className='match-search-container'>
          <MatchSearchComponent
            onCancel={handleCancel}
            onSearch={requestMatch}
          />
        </div>
        <div className='user-stats-container-div'>
          {isUserStatsLoaded ? (
            <>
              <div className='solid-block-container' id='total-games-played'>
                <h2 className='solid-block-container-title'>Games Played</h2>
                <p className='solid-block-container-content'>{userStats?.games_played}</p>
              </div>
              <div className='solid-block-container' id='player-draws'>
                <h2 className='solid-block-container-title'>Draws</h2>
                <p className='solid-block-container-content'>{userStats?.draws}</p>
              </div>
              <div className='solid-block-container' id='player-wins'>
                <h2 className='solid-block-container-title'>Wins</h2>
                <p className='solid-block-container-content'>{userStats?.wins}</p>
              </div>
              <div className='solid-block-container' id='player-losses'>
                <h2 className='solid-block-container-title'>Losses</h2>
                <p className='solid-block-container-content'>{userStats?.losses}</p>
              </div>
            </>
          ) : (
            <>
              <div className='solid-block-container' id='total-games-played'>
                <p className='solid-block-container-content'>Loading...</p>
              </div>
              <div className='solid-block-container' id='player-draws'>
                <p className='solid-block-container-content'>Loading...</p>
              </div>
              <div className='solid-block-container' id='player-wins'>
                <p className='solid-block-container-content'>Loading...</p>
              </div>
              <div className='solid-block-container' id='player-losses'>
                <p className='solid-block-container-content'>Loading...</p>
              </div>
            </>

          )}
        </div>
      </div>
    </div>

  );
}
