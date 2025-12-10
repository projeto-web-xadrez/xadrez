import { useEffect, useState } from "react";
import '../styles/settings-modal-styles.css'

interface SettingsModalProps {
    onClose: () => void;
    onUpdateSettings: (selectedBackground: string, selectedPiece: string) => void;
}

const backgrounds = [
    'blue-marble',
    'blue2',
    'blue3',
    'canvas2',
    'grey',
    'horsey',
    'leather',
    'maple',
    'maple2',
    'marble',
    'metal',
    'olive',
    'wood',
    'wood2',
    'wood3',
    'wood4',
];

const pieces = [
    'alpha',
    'california',
    'celtic',
    'companion',
    'dubrovny',
    'fresca',
    'horsey',
    'kosal',
    'maestro',
    'pixel',
    'riohacha',
    'staunty',
    'anarcandy',
    'cardinal',
    'chess7',
    'cooke',
    'fantasy',
    'gioco',
    'icpieces',
    'leipzig',
    'merida',
    'mpchess',
    'reillycraig',
    'shapes',
    'tatiana',
    'caliente',
    'cburnett',
    'chessnut',
    'disguised',
    'firi',
    'governor',
    'kiwen-suwi',
    'letter',
    'monarchy',
    'pirouetti',
    'rhosgfx',
    'spatial',
    'xkcd'
];

export default function SettingsModal(props: SettingsModalProps) {
    const [page, setPage] = useState<'background' | 'piece'>('background');

    const [background, setBackground] = useState<string>(localStorage.getItem('background') || 'maple');
    const [piece, setPiece] = useState<string>(localStorage.getItem('piece') || 'merida');

    useEffect(() => {
        localStorage.setItem('background', background);
        localStorage.setItem('piece', piece);
        props.onUpdateSettings(background, piece);
    }, [background, piece]);

    return (
        <div className='settings-modal-backdrop'>
            <div className='settings-modal-component-div'>
                <h3 className="settings-modal-title">
                    Board Settings
                </h3>

                <div className="settings-modal-tabs">
                    <button
                        className={`settings-tab-btn ${page === 'background' ? 'active' : ''}`}
                        onClick={() => setPage('background')}
                    >
                        Board Background
                    </button>
                    <button
                        className={`settings-tab-btn ${page === 'piece' ? 'active' : ''}`}
                        onClick={() => setPage('piece')}
                    >
                        Chess Pieces
                    </button>
                </div>

                {page === 'background' && (
                    <div className="settings-modal-input-body">
                        <div
                            className="backgrounds-grid"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, 80px)',
                                justifyContent: 'center',
                                gap: '16px',
                            }}
                        >
                            {backgrounds.map((bg) => (
                                <img
                                    className={`background ${bg === background ? 'background-selected' : 'background-not-selected'}`}
                                    key={bg}
                                    src={`/board_bg/${bg}.thumbnail.jpg`}
                                    onClick={() => setBackground(bg)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {page === 'piece' && (
                    <div className="settings-modal-input-body">
                        <div
                            className="pieces-grid"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, 60px)',
                                justifyContent: 'center',
                                gap: '12px',
                            }}
                        >
                            {pieces.map((p) => (
                                <img
                                    className={`piece ${p === piece ? 'piece-selected' : 'piece-not-selected'}`}
                                    key={p}
                                    src={`/pieces/${p}/wP.svg`}
                                    onClick={() => setPiece(p)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="settings-modal-footer">
                    <div className="settings-modal-footer-buttons">
                        <button
                            className="settings-modal-btn settings-modal-btn-confirm"
                            onClick={() => {
                                props.onClose();
                            }}
                        >
                            Ok
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}