import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MatchHistoryList from "../components/dashboard/MatchHistoryList";
import '../styles/profile-styles.css'

interface ApiGameType {
    game_id: string;
    white_id: string;
    black_id: string;
    ended_at: string;
    last_fen?: string;
    pgn?: string;
    result?: string;
    result_reason?: string;
    started_at: string;
    status: string;
    black_username: string;
    white_username: string;
};

interface UserType {
    username: string;
    created_at: string;
    stats: UserStatsType
}

interface UserStatsType {
    draws: number;
    games_played: number;
    last_updated?: string;
    losses: number;
    wins: number;
};

interface PastGameType {
    player1: string,
    player1Id: string,
    player2: string,
    player2Id: string,
    winner: string,
    date: string,
    duration: number,
    last_fen: string,
    game_id: string
};

export default function Profile() {
    const { id } = useParams();
    const [pastGames, setPastGames] = useState<PastGameType[]>([]);
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function exec() {
            try {
                setLoading(true);
                const userResponse = await axios.get(`/api/userstats/${id}`);
                const gamesResponse = await axios.get(`/api/game?user=${id}`);

                setUser(userResponse.data as UserType);
                setPastGames(
                    (gamesResponse.data as ApiGameType[])
                        .filter(game => game.status !== 'in_progress')
                        .map(game => ({
                            player1: game.white_username,
                            player1Id: game.white_id,
                            player2: game.black_username,
                            player2Id: game.black_id,
                            winner: (game.result != "draw") ? ((game as any)[`${game.result}_username`] as string) : "draw",
                            date: game.started_at,
                            duration: Math.ceil((new Date(game.ended_at).getTime() - new Date(game.started_at).getTime()) / 1000),
                            last_fen: game.last_fen,
                            game_id: game.game_id
                        } as PastGameType))
                );

            } finally {
                setLoading(false);
            }
        }
        exec();
    }, [id]);

    if (loading) {
        return (
            <div className="profile-main">
                <div className="profile-container">
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        Loading profile...
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="profile-main">
                <div className="profile-container">
                    <div style={{ textAlign: 'center', padding: '40px', color: '#e74c3c' }}>
                        User not found
                    </div>
                </div>
            </div>
        );
    }

    const { username, created_at, stats } = user;
    const { wins, draws, losses, games_played } = stats;

    const winPercentage = games_played > 0 ? Math.round((wins / games_played) * 100) : 0;
    const drawPercentage = games_played > 0 ? Math.round((draws / games_played) * 100) : 0;
    const lossPercentage = games_played > 0 ? Math.round((losses / games_played) * 100) : 0;

    const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="profile-main">
            <div className="profile-container">
                <div className="profile-header">
                    <div className="profile-info">
                        <h1 className="profile-username">{username}</h1>
                        <p className="profile-created-at">
                            Member since {formattedDate}
                        </p>
                    </div>
                </div>

                <div className="profile-stats">
                    <div className="stat-card">
                        <span className="stat-value">{games_played}</span>
                        <span className="stat-label">Matches</span>
                    </div>

                    <div className="stat-card stat-wins">
                        <span className="stat-value">{wins}</span>
                        <span className="stat-label">Wins</span>
                    </div>

                    <div className="stat-card stat-draws">
                        <span className="stat-value">{draws}</span>
                        <span className="stat-label">Draws</span>
                    </div>

                    <div className="stat-card stat-losses">
                        <span className="stat-value">{losses}</span>
                        <span className="stat-label">Losses</span>
                    </div>
                </div>

                <div className="profile-winrate">
                    <h3 className="winrate-title">Win rate</h3>
                    <div className="winrate-bar-container">
                        <div className="winrate-bar">
                            <div
                                className="winrate-segment wins"
                                style={{ width: `${winPercentage}%` }}
                            />
                            <div
                                className="winrate-segment draws"
                                style={{ width: `${drawPercentage}%` }}
                            />
                            <div
                                className="winrate-segment losses"
                                style={{ width: `${lossPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="winrate-labels">
                        <div className="winrate-label">
                            <div className="winrate wins" />
                            <span>Wins: {winPercentage}%</span>
                        </div>
                        <div className="winrate-label">
                            <div className="winrate draws" />
                            <span>Draws: {drawPercentage}%</span>
                        </div>
                        <div className="winrate-label">
                            <div className="winrate losses" />
                            <span>Losses: {lossPercentage}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <MatchHistoryList games={pastGames} />

        </div>
    );
}