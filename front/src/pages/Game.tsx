import { useEffect, useRef, useState, type RefObject } from 'react';
import { type Color, type Move, type Square } from 'chess.js';
import GameDisplayComponent, { type GameDisplayHandle } from '../components/gameboard/GameDisplayComponent';
import type { SoundPlayerHandle } from '../components/SoundPlayerComponent';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MessageType = {
  INIT: 'init',
  PLAYER_MOVED: 'player_moved',
  WELCOME: 'welcome',
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended'
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
            data: JSON.stringify(this, (key: string, val: string) =>{
                if(key === 'type') return undefined;
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
    color?: Color;
    opponent_id?: string;
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
    player_id: string;

    constructor(roomId: string, playerId: string) {
        super(MessageType.INIT);
        this.room_id = roomId;
        this.player_id = playerId;
    }
}

export default function Game({soundPlayer}: {soundPlayer: RefObject<SoundPlayerHandle | null>}) {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    if(!gameId || !isAuthenticated) {
        navigate('/');
        return null;
    }

    const location = useLocation();
    
    // If this flag is true, we are sure this is a live game, so we don't need to
    // request the API to check it. However, if it isn't, it could still be a live game
    // (cause the user may have refreshed the page or retyped the URL)
    useEffect(() => {
        if(location?.state?.liveGame)
            alert('Live game')
    }, []);

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
    const client = useRef<WebSocket>(new WebSocket(`http://localhost:80/gameserver/ws?csrfToken=${localStorage.getItem('csrf_token')}`));
    const [startSettings, setStartSettings] = useState<{
        playingColor: Color,
        pgn: string
    } | null>();

    client.current.onopen = () => {
        setConnected(true);
    
        const msg = new InitMessage('TODO: MOVER ROOM ID PARA A QUERY E VALIDAR NO GAMESERVER', /*TODO: REMOVER UUID DAQUI (pode ser inferido pelo session token no server-side)*/localStorage.getItem('clientId') as string).encode();
        client.current.send(msg);
    }
    client.current.onclose = (e) => {
        setConnected(false);
        console.error(`Disconnected. Reason: ${e.reason}, code = ${e.code}`);
    }

    client.current.onmessage = (e) => {
        const msg = JSON.parse(e.data) as IncomingMessage;
        console.log(`Received message ${msg.type}`);

        switch(msg.type) {
            case MessageType.WELCOME:
                const welcome = JSON.parse(msg.data) as WelcomeMessage
                
                setStartSettings({
                    pgn: welcome.game_pgn as string,
                    playingColor: welcome.color as Color
                });
            break;
            case MessageType.PLAYER_MOVED:
                const playerMoved = JSON.parse(msg.data) as PlayerMovedMessage;
                if(displayHandle.current?.pushMove)
                    displayHandle.current?.pushMove(playerMoved)
            break;
            case MessageType.GAME_STARTED:
                alert('Game started');
                break;
            case MessageType.GAME_ENDED:

            break;
        }
    }

    const onPlayerMove = (move: Move) => {
        if(!connected || client === null)
            return;
        client.current.send(new PlayerMovedMessage(move).encode());
    };

    return (
        <>
            <GameDisplayComponent
                boardStyle={{
                    boardBackground: '/board_bg/maple.jpg',
                    pieceStyle: 'merida', //cburnett
                    pieceSize: 50,
                    shouldLabelSquares: true
                }}
                type='playing'
                pgn={startSettings?.pgn || ''}
                playerColor={startSettings?.playingColor || 'w'}
                perspective={startSettings?.playingColor || 'w'}
                onPageChanged={null}
                onPlayerMove={onPlayerMove}
                soundPlayer={soundPlayer}
                ref={displayHandle}
            />
        </>
    );
}
