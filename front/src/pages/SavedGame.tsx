import { useEffect, useRef, useState, type RefObject } from 'react';
import { type Color } from 'chess.js';
import GameDisplayComponent, { type GameDisplayHandle } from '../components/gameboard/GameDisplayComponent';
import type { SoundPlayerHandle } from '../components/SoundPlayerComponent';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios, { type AxiosRequestConfig } from 'axios';
import ConfirmDialog from '../components/DialogConfirmComponent';
import '../styles/saved-game-styles.css'
import { Edit, Trash2 } from 'lucide-react';
import EditSavedModal from '../components/savedgames/EditSavedGameModal';

interface SavedGame {
    user_id: string,
    game_id: string,
    name: string,
    pgn: string,
    last_fen: string,
};

export default function SavedGame({ soundPlayer }: { soundPlayer: RefObject<SoundPlayerHandle | null> }) {
    const { gameId } = useParams();

    const navigate = useNavigate();
    const { isAuthenticated, csrf } = useAuth();

    if (!gameId || !isAuthenticated) {
        navigate('/');
        return null;
    }

    const displayHandle = useRef<GameDisplayHandle>(null);
    const [game, setGame] = useState<SavedGame | null>(null);
    const [perspective, setPerspective] = useState<Color>('w');

    const axiosSettings = {
        withCredentials: true, headers: {
            'X-CSRF-Token': csrf,
            'Content-Type': 'application/json',
        }, xsrfHeaderName: 'X-CSRF-Token'
    } as AxiosRequestConfig;

    useEffect(() => {
        axios.get(`/api/savedgame/${gameId}`, axiosSettings)
            .then(game => setGame(game.data as SavedGame))
            .catch(e => alert(e))
    }, []);


    const [isDelDialogOpen, setDelDialogOpen] = useState<boolean>(false)
    const [isEditModalOpen, setEditModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<null | string>(null);

    return (
        <>

            {isDelDialogOpen && <ConfirmDialog
                cancelText='Cancel'
                confirmText='Delete'
                isOpen={true}
                message='Are you sure you want to delete this game?'
                onClose={() => setDelDialogOpen(false)}
                onConfirm={async () => {
                    await axios.delete(`/api/savedgame/${game?.game_id}`, axiosSettings)
                        .then(() => navigate('/games'))
                        .catch(() => alert('Error deleting game'));
                    setDelDialogOpen(false);
                }}
                title='Delete Game'
                type='danger'
            />}

            {isEditModalOpen && (
                <EditSavedModal
                    game={game}
                    onConfirm={async (PGN: string, Name: string) => {
                        if (!PGN || !Name) {
                            setError("PGN and Name can't be empty strings");
                            return;
                        }

                        try {
                            await axios.put(`/api/savedgame/${game?.game_id}`, { PGN, Name }, axiosSettings);
                            setEditModalOpen(false);
                            if (!game) return;
                            setGame({ ...game, pgn: PGN, name: Name });
                        } catch (err: any) {
                            setError(err.response?.data);
                        }
                    }}
                    onCancel={() => { setEditModalOpen(false); setError(null) }}
                    error={error}
                />
            )}

            <div >
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    marginTop: '4%',

                }} >
                    <div className="savedgame-container" style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}>

                        <div className="savedgame-header">
                            <h2 className="savedgame-title">{game?.name}</h2>
                            <div className="savedgame-buttons">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setError(null);
                                        setEditModalOpen(true);
                                    }}
                                    className="savedgame-edit-btn"
                                    title="Edit Game"
                                >
                                    <Edit className="savedgame-icon" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setError(null);
                                        setDelDialogOpen(true);
                                    }}
                                    className="savedgame-delete-btn"
                                    title="Delete Game"
                                >
                                    <Trash2 className="savedgame-icon" />
                                </button>
                            </div>
                        </div>

                        <GameDisplayComponent
                            boardStyle={{
                                boardBackground: '/board_bg/maple.jpg',
                                pieceStyle: 'merida', //cburnett
                                pieceSize: 55,
                                shouldLabelSquares: true
                            }}
                            type={'spectating'}
                            pgn={game?.pgn || ''}
                            playerColor={null}
                            perspective={perspective}
                            onPlayerSwitchPerspective={(p) => setPerspective(p)}
                            soundPlayer={soundPlayer}
                            ref={displayHandle}
                        />
                    </div>

                </div>
            </div>
        </>
    );
}
