import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import axios, { type AxiosRequestConfig } from 'axios';

import AddSavedGameModal from '../components/savedgames/AddSavedGameModal';
import ConfirmDialog from '../components/DialogConfirmComponent';
import EditSavedModal from '../components/savedgames/EditSavedGameModal';
import ImportlLichessModal from '../components/savedgames/ImportLichessModal';
import GameList from '../components/savedgames/SavedGamesList';

import '../styles/games-styles.css'

interface SavedGame {
  game_id: string,
  user_id: string,
  name: string,
  pgn: string,
  last_fen: string,
};

async function handleLichessImport(username: string, maxGames: number, axiosSettings: AxiosRequestConfig) {
  if (username == "") {
    return [];
  }

  const res = await fetch(`https://lichess.org/api/games/user/${username}?max=${maxGames}&pgnInJson=true&lastFen=true`, {
    headers: { "Accept": "application/x-ndjson" }
  });

  if (res.status == 200) {
    const text = await res.text();

    const games = text
      .trim()
      .split("\n")
      .map(line => JSON.parse(line))
      .map(game => ({
        PGN: game.pgn,
        Name: `${game.players.white.user.name} x ${game.players.black.user.name} - ${game.id}`
      }));
    
    await axios.post(`/api/savedgame`, games, axiosSettings);
  } else {
    const text = await res.text();
    const error = JSON.parse(text)
    throw new Error(error.error)
  }


}

export default function Games() {
  const { isAuthenticated, csrf } = useAuth();
  const [isDelDialogOpen, setDelDialogOpen] = useState<boolean>(false)
  const [isEditModalOpen, setEditModalOpen] = useState<boolean>(false)
  const [isAddGameModalOpen, setAddGameModalOpen] = useState<boolean>(false)
  const [isImportLichessModalOpen, setImportLichessModalOpen] = useState<boolean>(false)

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
    axios.get(`/api/savedgame`, axiosSettings)
      .then((games: any) => setGames(games.data as SavedGame[]))
      .catch((e: any) => setError(e))
  }, []);

  return (
    <div className='main'>
      <GameList
        games={games}
        onDelete={(g) => { setGameToHandle(g); setDelDialogOpen(true); }}
        onUpdate={(g) => { setGameToHandle(g); setEditModalOpen(true); }}
        onAddGame={() => setAddGameModalOpen(true)}
        onImportLichess={() => setImportLichessModalOpen(true)}
      />

      {isDelDialogOpen && (
        <ConfirmDialog
          cancelText='Cancel' confirmText='Delete' isOpen={true} message='Are you sure you want to delete this game?'
          title='Delete Game' type='danger'
          onConfirm={async () => {
            if (!gameToHandle) return;
            try {
              const res = await axios.delete(`/api/savedgame/${gameToHandle.game_id}`, axiosSettings);
              setGames(res.data);
            } catch (err: any) {
              setError(err.response?.data);
            }
          }
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
              const res = await axios.put(`/api/savedgame/${gameToHandle?.game_id}`, { PGN, Name }, axiosSettings);
              setGames(res.data);
              setEditModalOpen(false);
            } catch (err: any) {
              setError(err.response?.data);
            }
          }}
          onCancel={() => { setEditModalOpen(false); setError(null) }}
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
              const res = await axios.post(`/api/savedgame`, { PGN, Name }, axiosSettings);
              setGames(res.data);
              setAddGameModalOpen(false);
            } catch (err: any) {
              setError(err.response?.data);
            }
          }}
          onCancel={() => { setAddGameModalOpen(false); setError(null) }}
          error={error}
        />
      )}


      {isImportLichessModalOpen && (
        <ImportlLichessModal
          onConfirm={async (username, maxGames) => {
            if (!username || !maxGames) {
              setError("Lichess username can't be empty");
              return;
            }
            try {
              await handleLichessImport(username, maxGames, axiosSettings)
              axios.get(`/api/savedgame`, axiosSettings)
                .then((games: any) => {
                  setGames(games.data as SavedGame[]);
                  setImportLichessModalOpen(false);
                })
                .catch((e: any) => {
                  setError(e.response?.data)
                })


            } catch (err: any) {
              setError(err.message);
            }
          }}
          onCancel={() => { setImportLichessModalOpen(false); setError(null) }}
          error={error}
        />
      )}
    </div>

  );
}
