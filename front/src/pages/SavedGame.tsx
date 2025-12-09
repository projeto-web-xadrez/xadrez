import { useEffect, useRef, useState, type RefObject } from 'react';
import { type Color } from 'chess.js';
import GameDisplayComponent, { type GameDisplayHandle } from '../components/gameboard/GameDisplayComponent';
import type { SoundPlayerHandle } from '../components/SoundPlayerComponent';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios, { type AxiosRequestConfig } from 'axios';
import ConfirmDialog from '../components/DialogConfirmComponent';


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
    const { isAuthenticated, csrf, clientId } = useAuth();

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
        axios.get(`/api/game/${gameId}`, axiosSettings)
            .then(game => setGame(game.data as SavedGame))
            .catch(e => alert(e))
    }, []);


    const [dialogOpen, setDialogOpen] = useState<boolean>(false)

    return (
        <>
        {dialogOpen && <ConfirmDialog
            cancelText='Cancel'
            confirmText='Delete'
            isOpen={true}
            message='Are you sure you want to delete this game?'
            onClose={() => setDialogOpen(false)}
            onConfirm={async () => {
                await axios.delete(`/api/game/${game?.game_id}`, axiosSettings)
                            .then(() => navigate('/games'))
                            .catch(() => alert('Error deleting game'));
                setDialogOpen(false);
            }}
            title='Delete Game'
            type='danger'
        /> }
        
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            marginTop: '4%',
        }}>
            <div style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
            }}>

                {
                clientId === game?.user_id && <button
                    onClick={() => {
                        setDialogOpen(true);
                    }}
                >Delete Game</button>
                }
                <h2>{game?.name}</h2>

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
        </>
    );
}
