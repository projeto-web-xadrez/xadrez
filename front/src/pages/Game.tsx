import { useEffect, useRef, useState, type RefObject } from 'react';
import { type Color, type Move, type Square } from 'chess.js';
import GameDisplayComponent, { type GameDisplayHandle } from '../components/gameboard/GameDisplayComponent';
import type { SoundPlayerHandle } from '../components/SoundPlayerComponent';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GameEndedComponent from '../components/GameEndedComponent';
import axios from 'axios';
import '../styles/game-styles.css'

const MessageType = {
    INIT: 'init',
    PLAYER_MOVED: 'player_moved',
    WELCOME: 'welcome',
    GAME_STARTED: 'game_started',
    GAME_ENDED: 'game_ended',
    RESIGN: 'resign',
    PING: 'ping',
} as const;

interface IncomingMessage {
    type: string
    data: string
};

abstract class AbstractBaseMessage {
    protected type: string;

    constructor(type: string) {
        this.type = type;
    }

    encode() {
        return JSON.stringify({
            type: this.type,
            data: JSON.stringify(this, (key: string, val: string) => {
                if (key === 'type') return undefined;
                return val;
            })
        });
    }
}

class PlayerMovedMessage extends AbstractBaseMessage {
    move_s1: Square;
    move_s2: Square;
    move_notation: string;

    constructor(move: Move) {
        super(MessageType.PLAYER_MOVED);
        this.move_s1 = move.from;
        this.move_s2 = move.to;
        this.move_notation = move.san;
    }
}

class WelcomeMessage extends AbstractBaseMessage {
    room_id?: string;
    opponent_id?: string;
    player1_id?: string;
    player1_username?: string;
    player2_id?: string;
    player2_username?: string;
    game_fen?: string;
    game_pgn?: string;
    last_move_s1?: string;
    last_move_s2?: string;
    game_status?: string;
    winner_id?: string;

    constructor() {
        super(MessageType.WELCOME);
    }
}
class GameEndedMessage extends AbstractBaseMessage {
    winner_id?: string;

    constructor() {
        super(MessageType.GAME_ENDED);
    }
}

class InitMessage extends AbstractBaseMessage {
    room_id: string;

    constructor(roomId: string) {
        super(MessageType.INIT);
        this.room_id = roomId;
    }
}

class ResignMessage extends AbstractBaseMessage {
    constructor() {
        super(MessageType.RESIGN)
    }
}

class MessagePing extends AbstractBaseMessage {
    constructor() {
        super(MessageType.PING)
    }
}

const UsernameDisplay = ({ username }: { username: string | undefined }) =>
    <span
        style={{
            color: '#fff',
            fontWeight: "600",
            fontSize: "1rem",
            textAlign: 'left',
            marginLeft: '2px',
            marginTop: '0px',
            marginBottom: '0px',
            userSelect: "none",
        }}
    >
        {username || ''}
    </span>

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

interface UserStatsType {
    username: string;
    draws: number;
    games_played: number;
    last_updated: string;
    losses: number;
    wins: number;
};

export default function Game({ soundPlayer }: { soundPlayer: RefObject<SoundPlayerHandle | null> }) {
    const { gameId: paramGameId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { isAuthenticated, clientId } = useAuth();
    const [winner, setWinner] = useState<string | null>(null);
    const liveGame = useRef<boolean>(!!location?.state?.liveGame);
    const [liveGameState, setLiveGameState] = useState<boolean>(!!location?.state?.liveGame);

    if (!paramGameId || !isAuthenticated) {
        navigate('/');
        return null;
    }

    const gameId = useRef<string>(paramGameId);
    const displayHandle = useRef<GameDisplayHandle>(null);
    const [connected, setConnected] = useState(false);
    const client = useRef<WebSocket | null>(null);
    const [startSettings, setStartSettings] = useState<{
        playingColor: null | Color,
        pgn: string,
        playerWhiteUsername: string,
        playerWhiteId: string,
        playerBlackUsername: string,
        playerBlackId: string,
    } | null>();
    const [perspective, setPerspective] = useState<Color>('w');
    const [gameEndedOpen, setGameEndedOpen] = useState<boolean>(false);
    const [game, setGame] = useState<ApiGameType | null>(null);

    useEffect(() => {
        const exec = async () => {
            if (!liveGame.current) {
                try {
                    const game = (await axios.get(`/api/game/${gameId.current}`)).data as ApiGameType;
                    setGame(game);
                    liveGame.current = (game.status === 'in_progress');
                    setLiveGameState(liveGame.current);
                    if (!liveGame.current) {
                        setStartSettings({
                            pgn: game.pgn || '*',
                            playerBlackId: game.black_id,
                            playerWhiteId: game.white_id,
                            playerBlackUsername: game.black_username,
                            playerWhiteUsername: game.white_username,
                            playingColor: null
                        });
                        if (game.black_id === clientId)
                            setPerspective('b');
                        else setPerspective('w');
                    }

                } catch (e) {
                    alert(e)
                }
            }

            if (liveGame.current && !client.current) {
                client.current = new WebSocket(`/gameserver/ws?csrfToken=${localStorage.getItem('csrf_token')}`);
                console.log('Instantiated now')

                client.current.onopen = () => {
                    setConnected(true);

                    const msg = new InitMessage(gameId.current).encode();
                    client.current?.send(msg);
                }
                client.current.onclose = (e) => {
                    setConnected(false);
                    console.error(`Disconnected. Reason: ${e.reason}, code = ${e.code}`);
                }

                client.current.onmessage = (e) => {
                    const msg = JSON.parse(e.data) as IncomingMessage;
                    console.log(`Received message ${msg.type}`);

                    switch (msg.type) {
                        case MessageType.WELCOME:
                            const welcome = JSON.parse(msg.data) as WelcomeMessage

                            if (welcome.room_id !== gameId.current) {
                                gameId.current = welcome.room_id as string;
                                welcome.player1_id

                                // Update the URL without reloading the page
                                history.replaceState({}, '', `/game/${welcome.room_id}`);
                            }

                            const userId = localStorage.getItem('clientId') as string;
                            let color = null;
                            if (welcome.player1_id === userId)
                                color = 'w';
                            else if (welcome.player2_id === userId)
                                color = 'b';

                            const playing = color !== null;

                            if (color !== null)
                                setPerspective(color as Color)

                            setStartSettings({
                                pgn: welcome.game_pgn as string,
                                playingColor: playing ? (color as Color) : null,
                                playerWhiteId: welcome.player1_id as string,
                                playerWhiteUsername: welcome.player1_username as string,
                                playerBlackId: welcome.player2_id as string,
                                playerBlackUsername: welcome.player2_username as string,
                            });
                            break;
                        case MessageType.PLAYER_MOVED:
                            const playerMoved = JSON.parse(msg.data) as PlayerMovedMessage;
                            if (displayHandle.current?.pushMove)
                                displayHandle.current?.pushMove(playerMoved)
                            break;
                        case MessageType.GAME_STARTED:
                            break;
                        case MessageType.GAME_ENDED:
                            const message = JSON.parse(msg.data) as GameEndedMessage
                            setWinner(message?.winner_id as string);
                            setGameEndedOpen(true);
                            setLiveGameState(false);
                            axios.get(`/api/game/${gameId.current}`)
                                .then(res => setGame(res.data as ApiGameType))
                                .catch(() => { });

                            soundPlayer.current?.playSound(`/sounds/GameEnd.mp3`);
                            break;
                        case MessageType.PING:
                            client.current?.send(new MessagePing().encode())
                            break;
                    }
                }
            }
        }

        exec();



    }, []);


    const onPlayerMove = (move: Move) => {
        if (!connected || client === null)
            return;
        client.current?.send(new PlayerMovedMessage(move).encode());
    };

    const durationToString = (seconds: number) => {
        let minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;

        const hours = Math.floor(minutes / 60);
        minutes -= hours * 60;

        let h = hours !== 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : '';
        let m = minutes !== 0 ? `${minutes} minute${minutes === 1 ? '' : 's'}` : '';
        const s = seconds !== 0 ? `${seconds} second${seconds === 1 ? '' : 's'}` : '';

        if (h && (m || s))
            h += ', ';
        if (m && s)
            m += ', ';
        return h + m + s;
    }

    return (
        <>
            {(gameEndedOpen && startSettings?.playingColor) && <GameEndedComponent onClose={() => {
                setStartSettings((settings) => {
                    if (!settings)
                        return settings;
                    return {
                        ...settings,
                        playingColor: null,
                    }
                });
                setGameEndedOpen(false);
                liveGame.current = false;
                setLiveGameState(false);
                displayHandle.current?.setType('spectating');
                navigate(`/game/${gameId.current}`, {
                    state: {
                        liveGame: false
                    },
                    flushSync: true,
                });
            }} playerId={clientId as string} winner={winner as string} />}

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                marginTop: `${(!liveGameState && game) ? '1%' : '5%'}`,
            }}>

                <div className="game-container" style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                }}>
                    <div className={`game-header ${(!liveGameState && game) ? ' game-header-ended' : ''}`}>
                        <h2 className="game-title">
                            {(liveGameState ? 'Live Match: ' : 'Recorded Match: ') + `${startSettings?.playerWhiteUsername} vs ${startSettings?.playerBlackUsername}`}
                        </h2>

                        {!liveGameState && game && <div>
                            <p className="label">Duration</p>
                            <p className="descDuration">
                                {durationToString(Math.ceil((new Date(game.ended_at).getTime() - new Date(game.started_at).getTime())/1000))}
                            </p>
                            <p className="label">Match Result</p>
                            {(game.result !== "draw") ?
                                (<p className="descWinner">{game.result === 'white' ? `${game.white_username} 🏆`
                                    : `${game.black_username} 🏆`}</p>)
                                :
                                (<p className="descDraw">Draw 🤝</p>)}
                            {game.result_reason && <>
                                <p className="label">Reason</p>
                                <p className="descReason">{game.result_reason}</p>
                            </>
                            }

                            <p className="label">Finished in</p>
                            <p className="descFinishDate">{
                                new Date(game.ended_at).toLocaleString('pt-BR')
                            }</p>

                        </div>
                        }
                    </div>

                    <UsernameDisplay username={perspective === 'b' ? startSettings?.playerWhiteUsername : startSettings?.playerBlackUsername} />
                    <GameDisplayComponent
                        boardStyle={{
                            boardBackground: '/board_bg/maple.jpg',
                            pieceStyle: 'merida', //cburnett
                            pieceSize: 55,
                            shouldLabelSquares: true
                        }}
                        type={startSettings?.playingColor === null ? 'spectating' : 'playing'}
                        pgn={startSettings?.pgn || ''}
                        playerColor={startSettings?.playingColor || 'w'}
                        perspective={perspective}
                        onPlayerMove={onPlayerMove}
                        onPlayerSwitchPerspective={(p) => setPerspective(p)}
                        onPlayerResign={() => {
                            if (startSettings?.playingColor !== null && client?.current?.send)
                                client.current.send(new ResignMessage().encode());
                        }}
                        soundPlayer={soundPlayer}
                        ref={displayHandle}
                    />

                    <UsernameDisplay username={perspective === 'w' ? startSettings?.playerWhiteUsername : startSettings?.playerBlackUsername} />
                </div>
            </div>
        </>
    );
}
