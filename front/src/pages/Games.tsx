import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import axios, { type AxiosRequestConfig } from 'axios';

import AddSavedGameModal from '../components/savedgames/AddSavedGameModal';
import ConfirmDialog from '../components/DialogConfirmComponent';
import EditSavedModal from '../components/savedgames/EditSavedGameModal';
import GameList from '../components/savedgames/SavedGamesList';

import '../styles/Games.css'

interface SavedGame {
  game_id: string,
  user_id: string,
  name: string,
  pgn: string,
  last_fen: string,
};

export default function Games() {
  const { isAuthenticated, csrf } = useAuth();
  const [isDelDialogOpen, setDelDialogOpen] = useState<boolean>(false)
  const [isEditModalOpen, setEditModalOpen] = useState<boolean>(false)
  const [isAddGameModalOpen, setAddGameModalOpen] = useState<boolean>(false)

  const [gameToHandle, setGameToHandle] = useState<SavedGame | null>(null)
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<SavedGame[]>([]);

  const navigate = useNavigate();

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
        onDelete={(g) => { setGameToHandle(g); setDelDialogOpen(true); }}
        onUpdate={(g) => { setGameToHandle(g); setEditModalOpen(true); }}
        onAddGame={() => setAddGameModalOpen(true)}
      />

      {isDelDialogOpen && (
        <ConfirmDialog
          cancelText='Cancel' confirmText='Delete' isOpen={true} message='Are you sure you want to delete this game?'
          title='Delete Game' type='danger'
          onConfirm={async () => { 
            if (!gameToHandle) return;
              try {
                const res = await axios.delete(`/api/manage-game/${gameToHandle.game_id}`, axiosSettings);
                setGames(res.data);
              } catch (err: any) {
                setError(err.response?.data);
              }}
          }
          onClose={() => setDelDialogOpen(false)}
        />
      )}

      {isEditModalOpen && (
        <EditSavedModal
          game={gameToHandle}
          onConfirm={async (PGN, Name) => {
            if (!PGN || !Name) {
                setError("PGN and Name can't be empty strings");
                return;
            }
            try {
              const res = await axios.put(`/api/manage-game/${gameToHandle?.game_id}`, {PGN, Name}, axiosSettings);
              setGames(res.data);
              setEditModalOpen(false);
            } catch (err: any) {
              setError(err.response?.data);
            }
          }}
          onCancel={() => {setEditModalOpen(false); setError(null)}}
          error={error}
        />
      )}

      {isAddGameModalOpen && (
        <AddSavedGameModal
          onConfirm={async (PGN, Name) => {
            if (!PGN || !Name) {
                setError("PGN and Name can't be empty strings");
                return;
            }
            try {
              const res = await axios.post(`/api/manage-game`, {PGN, Name}, axiosSettings);
              setGames(res.data);
              setAddGameModalOpen(false);
            } catch (err: any) {
              console.log("adkadkad")
              setError(err.response?.data);
            }
          }}
          onCancel={() => {setAddGameModalOpen(false); setError(null)}}
          error={error}
        />
      )}

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
