import { useEffect, useRef, useState, type RefObject } from 'react';
import { type Color, type Move, type Square } from 'chess.js';
import GameDisplayComponent, { type GameDisplayHandle } from '../components/gameboard/GameDisplayComponent';
import type { SoundPlayerHandle } from '../components/SoundPlayerComponent';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GameEndedComponent from '../components/GameEndedComponent';

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

export default function Game({ soundPlayer }: { soundPlayer: RefObject<SoundPlayerHandle | null> }) {
    const { gameId: paramGameId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, clientId } = useAuth();
    const [winner, setWinner] = useState<string | null>(null)

    if (!paramGameId || !isAuthenticated) {
        navigate('/');
        return null;
    }

    const gameId = useRef<string>(paramGameId);

    // If this flag is true, we are sure this is a live game, so we don't need to
    // request the API to check it. However, if it isn't, it could still be a live game
    // (cause the user may have refreshed the page or retyped the URL)
    /*
    const location = useLocation();
    useEffect(() => {
        if(location?.state?.liveGame)
            alert('Live game') // Connect to websocket
        else // Connect to API, then connect to websocket if necessary
    }, []);*/

    // TODO: if liveGame, connect to websocket directly
    // otherwise, request the API (with a HTTP request) for game information
    // the API should return whether it is a live game, the players, etc...
    // So, in the act of making the rooom, we should also store it in the database.
    // And we should also write this API route that gets the game info from DB

    // TODO: add GameEndedComponent when game finishes
    // TODO: only allow user to move when received a GameStarted or a welcome with game_status == 'started'
    // TODO: abstract this WebSocket away
    // TODO: make a checked king highlight in the DumbDisplayBoard

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


    useEffect(() => {
        if (!client.current) {
            client.current = new WebSocket(`/gameserver/ws?csrfToken=${localStorage.getItem('csrf_token')}`);
            console.log('Instantiated now')
            setTimeout(() => {
                console.log('ha')
            }, 1000)
            client.current.onopen = () => {
                setConnected(true);
                console.log('Connected')
                const msg = new InitMessage(gameId.current).encode();
                console.log(msg)
                
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
                            alert('You have an ongoing game!');
                            gameId.current = welcome.room_id as string;
                            welcome.player1_id

                            // Update the URL without reloading the page
                            history.replaceState({}, '', `/game/${welcome.room_id}`);
                        }
                        console.log(welcome)
                        const userId = localStorage.getItem('clientId') as string;
                        console.log(userId)
                        let color = null;
                        if(welcome.player1_id === userId)
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
                        setWinner(message?.winner_id as string)
                        break;
                    case MessageType.PING:
                        client.current?.send(new MessagePing().encode())
                        break;
                }
            }
        }
    }, []);


    const onPlayerMove = (move: Move) => {
        if (!connected || client === null)
            return;
        client.current?.send(new PlayerMovedMessage(move).encode());
    };

    return (
        <>
        {
            (!winner) ? (
            
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            marginTop: '5%',
        }}>

            <div style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
            }}>
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
        </div>)
        :
        (<GameEndedComponent playerId={clientId as string} winner={winner as string} />)   
        }
        
        </>
        
        
    );
}
