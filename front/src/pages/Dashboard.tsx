import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebsocket } from '../context/WebSocketContext';
import { useEffect, useState, type RefObject } from 'react';
import MatchSearchComponent from '../components/dashboard/MatchSearchComponent';
import MatchHistoryList from '../components/dashboard/MatchHistoryList';
import "../styles/dashboard-styles.css"
import type { SoundPlayerHandle } from '../components/SoundPlayerComponent';

interface UserStatsType {
  draws: number,
  games_played: number,
  last_updated: string,
  losses: number
  wins: number
}

interface PastGameType {
  player1: string,
  player2: string,
  player1Id: string,
  player2Id: string,
  winner: string,
  date: string,
  duration: number,
  last_fen: string,
  game_id: string
}


export default function Dashboard({soundPlayer}: {soundPlayer: RefObject<SoundPlayerHandle | null>}) {
  const playerId = localStorage.getItem("clientId") || "null";
  const { isAuthenticated, clientId } = useAuth();
  const { sendMessage, subscribe, unsubscribe } = useWebsocket()
  const [isUserStatsLoaded, setUserStatsLoaded] = useState<boolean>(false)
  const [userStats, setUserStats] = useState<UserStatsType | undefined>(undefined)
  const [pastGames, setPastGames] = useState<PastGameType[]>([])

  const navigate = useNavigate();


  if (!isAuthenticated)
    return null;

  useEffect(() => {
    fetchUserStats()
    fetchUserPastGames()
  }, [isAuthenticated])

  const requestMatch = () => {
    subscribe("matchFound", (data) => {
      const room = data['roomId'] as string;
      unsubscribe("matchFound"); // evita múltiplas execuções
      soundPlayer?.current?.playSound(`/sounds/GameStart.mp3`);
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

  const fetchUserPastGames = async () => {
    await fetch(`api/game?user=${clientId}`, {
      method: "GET",
      credentials: "include",
    }).then(async (data: any) => {
      const jsonData = await data.json()
      console.log(jsonData)
      const past_games_array: PastGameType[] = jsonData.filter((e:any) => e.status == "ended").map((element: any) => {
        const calculated_duration = Math.ceil((new Date(element.ended_at).getTime() - new Date(element.started_at).getTime())/1000);
        const cur = {
          "player1": element.white_username,
          "player2": element.black_username,
          "player1Id": element.white_id,
          "player2Id": element.black_id,
          "winner": (element.result != "draw") ? element[`${element.result}_username`] : "draw",
          "date": element.started_at,
          "duration": calculated_duration,
          "last_fen": element.last_fen,
          "game_id": element.game_id
        } as PastGameType

        return cur;
      })
      setPastGames(past_games_array)
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
        <div className='user-stats-container-div' style={{width:'100%1'}}>
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

      <MatchHistoryList
        games={pastGames}
      />
    </div>

  );
}
