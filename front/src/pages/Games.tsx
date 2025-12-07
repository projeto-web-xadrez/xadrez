import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebsocket } from '../context/WebSocketContext';
import { useEffect, useState, type SetStateAction } from 'react';
import axios, { type AxiosRequestConfig } from 'axios';
import SavedGameCard from '../components/SavedGameCardComponent';
import ConfirmDialog from '../components/DialogConfirmComponent';

import '../styles/Games.css'

interface SavedGame {
  game_id: string,
  user_id: string,
  name: string,
  pgn: string,
  last_fen: string,
};

import React from 'react';

interface GameListProps {
  games: SavedGame[];
  onDelete: (game: SavedGame) => void;
  onUpdate: (game: SavedGame) => void;
}

const GameList = ({ games, onDelete, onUpdate }: GameListProps) => {
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
              <SavedGameCard
                {...game}
                onDelete={() => onDelete(game)}
                onUpdate={() => onUpdate(game)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Games() {
  const { isAuthenticated, csrf, clientId } = useAuth();
  const [isDelDialogOpen, setDelDialogOpen] = useState<boolean>(false)
  const [isEditModalOpen, setEditModalOpen] = useState<boolean>(false)

  const [gameToHandle, setGameToHandle] = useState<SavedGame | null>(null)

  const navigate = useNavigate();
  const [error, setError] = useState<null | string>();
  const [games, setGames] = useState<SavedGame[]>([]);

  if (!isAuthenticated) {
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
          onDelete={(game) => {
            setGameToHandle(game);
            setDelDialogOpen(true);
          }}

          onUpdate={(game) => {
            setGameToHandle(game);
            setEditModalOpen(true);
          }}
      />

      {isDelDialogOpen && <ConfirmDialog
        cancelText='Cancel'
        confirmText='Delete'
        isOpen={true}
        message='Are you sure you want to delete this game?'
        onClose={() => setDelDialogOpen(false)}
        onConfirm={async () => {
          if(gameToHandle == null) return;
          await axios.delete(`/api/manage-game/${gameToHandle?.game_id}`, axiosSettings)
            .then((response: any) => {
                if(response.status == 200) {
                  setGames(response.data as SavedGame[])
                  console.log("deletado: " + gameToHandle?.game_id)
                } 
                
              })
            .catch(() => alert('Error deleting game'));
          setDelDialogOpen(false);
        }}
        title='Delete Game'
        type='danger'
      />}

      <button onClick={() => {

        const data = {
          'name': 'Teste',
          'pgn': `1. e4 e5 2. Nc3 Nc6 3. Nf3 Nf6 4. Bc4 Nxe4 5. Nxe4 d5 { C55 Italian Game: Two Knights Defense } 6. Bxd5 Qxd5 7. Nc3 Qe6 8. d3 f5 9. Ng5 Qf6 10. Nd5 Qxg5 { Black resigns. } 1-0`
        }

        axios.post(`/api/manage-game`,
          data
          , axiosSettings)
          .then((response: any) => {
            if (response.status == 200) {
              setGames(response.data as SavedGame[])
            }
          })

      }}>
        Add game

      </button>
    </div>

  );
}
