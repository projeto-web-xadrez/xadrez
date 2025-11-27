import "../styles/leaderboard-styles.css"
import { useState, useEffect } from "react"
import LbPlayer, {type PlayerProps } from "../components/LeaderboardPlayerComponent"

export default function Leaderboard() {
    const [isLoading, setLoading] = useState<boolean>(true)
    const [playerMap, setPlayerMap] = useState<PlayerProps[]>([])

    useEffect(() => {
        async function fetchPlayers() {
            try {
                const response = await fetch(
                    "https://api.chesstools.org/fide/top_active/?limit=100&history=false"
                );
                const data = await response.json();

                const players: PlayerProps[] = data.map((p: any, idx: number) => ({
                    key: idx,
                    rank: p.rank,
                    name: p.name,
                    fide_id: p.fide_id?.toString() ?? "-",
                    country: p.country ?? "UN",
                    rating: p.rating.toString()
                }));

                setPlayerMap(players);
            } catch (err) {
                console.error("Erro ao buscar players:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchPlayers();
    }, []);

    return (
        <div className="leaderboard-page">
            {!isLoading ? (
                <>
                    <h1 className="leaderboard-title">Lista dos 100 melhores jogadores de xadrez mundialmente</h1>
                    <div className="leaderboard-list-div">
                    {playerMap?.map((p, index) => (
                        <LbPlayer
                            key={index}
                            rank={p.rank}
                            name={p.name}
                            fide_id={p.fide_id}
                            country={p.country}
                            rating={p.rating}
                        />
                    ))}
                </div>
                </>
                
            ) : (
                <p className="loading-text">Loading...</p>
            )}
        </div>
    )
}
