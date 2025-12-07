import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebsocket } from '../context/WebSocketContext';
import { useEffect, useState, type SetStateAction } from 'react';
import axios, { type AxiosRequestConfig } from 'axios';
import DumbDisplayBoard from '../components/gameboard/DumbDisplayBoardComponent';
import '../styles/Games.css'

interface SavedGame {
    game_id: string,
    user_id: string,
    name: string,
    pgn: string,
    last_fen: string,
};

import React from 'react';
import { Trash2, Edit, Eye } from 'lucide-react';

interface ChessGame {
  game_id: string;
  name: string;
  last_fen: string;
}

interface GameCardProps {
  games: SavedGame[];
  onDelete: (game: SavedGame) => void;
  onUpdate: (gameId: string) => void;
  clientId: string;
}

const GameList: React.FC<GameCardProps> = ({ games, onDelete, onUpdate, clientId }) => {
  const navigate = useNavigate();

  return (
    <div className="game-card-container">
      <div className="game-card-header">
        <h2 className="game-card-title">Saved Games</h2>
        <div className="game-card-count">
          {games.length} {games.length === 1 ? 'Game' : 'Games'}
        </div>
      </div>
      
      {games.length === 0 ? (
        <div className="game-card-empty">
          <div className="game-card-empty-icon">♔</div>
          <p className="game-card-empty-text">No saved games yet</p>
          <p className="game-card-empty-subtext">Add a new game to see it here</p>
        </div>
      ) : (
        <div className="game-card-grid">
          {games.map((game) => (
            <div key={game.game_id} className="game-card-item">
              {/* Game Header with Edit/Delete Buttons */}
              <div className="game-card-item-header">
                <h3 className="game-card-item-name">{game.name}</h3>
                <div className="game-card-header-buttons">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(game.game_id);
                    }}
                    className="game-card-btn-edit"
                    title="Edit Game"
                  >
                    <Edit className="game-card-icon" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(game);
                    }}
                    className="game-card-btn-delete"
                    title="Delete Game"
                  >
                    <Trash2 className="game-card-icon" />
                  </button>
                </div>
              </div>

              {/* Chess Board - Clickable Area */}
              <div 
                className="game-card-board-container"
                onClick={() => navigate(`/savedgame/${game.game_id}`)}
              >
                <div className="game-card-board-wrapper">
                  <DumbDisplayBoard
                    boardStyle={{
                      boardBackground: '/board_bg/maple.jpg',
                      pieceStyle: 'merida',
                      pieceSize: 20,
                      shouldLabelSquares: true
                    }}
                    state={{
                      allowedMoves: 'none',
                      fen: game.last_fen,
                      highlightedSquare: null,
                      lastMove: null,
                      perspective: 'w'
                    }}
                  />
                  
                  {/* Hover Overlay */}
                  <div className="game-card-board-overlay">
                    <div className="game-card-board-hover">
                      <Eye className="game-card-icon-large" color="white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Width View Button */}
              <div className="game-card-footer">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/savedgame/${game.game_id}`);
                  }}
                  className="game-card-btn-view"
                >
                  <Eye className="game-card-icon" />
                  View Game
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

async function onDelete(gameInstance: SavedGame, setDialogOpen: React.Dispatch<SetStateAction<Boolean>>, clientId: string) {
    const gameId = gameInstance?.game_id
    const ownerId = gameInstance?.user_id

    clientId === ownerId
    
}


export default function Games() {
    const { isAuthenticated, csrf, clientId } = useAuth();
    const [dialogOpen, setDialogOpen] = useState<boolean>(false)

    const navigate = useNavigate();
    const [error, setError] = useState<null | string>();
    const [games, setGames] = useState<SavedGame[]>([]);

    if(!isAuthenticated) {
        navigate('/login');
        return <></>
    }

    const axiosSettings = {
        withCredentials: true, headers: {
            'X-CSRF-Token': csrf,
            'Content-Type': 'application/json',
        }, xsrfHeaderName: 'X-CSRF-Token'
    } as AxiosRequestConfig;


    useEffect(() => {
        axios.get(`/api/manage-game`, axiosSettings)
            .then((games: any) => {
              setGames(games.data as SavedGame[])
            }
            )
            .catch((e: any) => setError(e))
    }, []);

    return (
        <div className='main'>
            <GameList
                games={games}
                onDelete={() => {}}
                onUpdate={() => {}}
                clientId={clientId as string}
            />

            <button onClick={() => {

                const data = {
                    'name': 'Teste',
                    'pgn': `1. e4 e5 2. Nc3 Nc6 3. Nf3 Nf6 4. Bc4 Nxe4 5. Nxe4 d5 { C55 Italian Game: Two Knights Defense } 6. Bxd5 Qxd5 7. Nc3 Qe6 8. d3 f5 9. Ng5 Qf6 10. Nd5 Qxg5 { Black resigns. } 1-0`
                }

                axios.post(`/api/manage-game`,
                    data
                    , axiosSettings)
                  .then((response: any) => {
                      if(response.status == 200) {
                        setGames(response.data as SavedGame[])
                      }
                  })

            }}>
                Add game

            </button>
        </div>

    );
}
