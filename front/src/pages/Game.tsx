import { useRef, useState } from 'react';
import DumbDisplayBoard, { type BoardState, type HighlightedPieceSquareType } from '../components/DumbDisplayBoardComponent';
import { Chess, type Color, type Move, type Square } from 'chess.js';
import SoundPlayerComponent, { type SoundPlayerHandle } from '../components/SoundPlayerComponent';

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

interface GamePage {
    move: Move | null,
    lastMoves : [Square, Square] | null
    fen: string
}

export default function Game() {
    const [connected, setConnected] = useState(false);
    const game = useRef<Chess>(new Chess());
    const [gameState, setGameState] = useState<BoardState>({
        allowedMoves: 'none',
        fen: new Chess().fen(),
        highlightedSquare: null,
        lastMove: null,
        perspective: 'w'
    });
    const [highlightedSquare, setHighlightedSquare] = useState<HighlightedPieceSquareType | null>(null);

    const soundPlayer = useRef<SoundPlayerHandle>(null);
    const client = useRef<WebSocket>(new WebSocket(`http://localhost:80/gameserver/ws?csrfToken=${localStorage.getItem('csrf_token')}`));
    
    const pages = useRef<GamePage[]>([{
        move: null,
        fen: new Chess().fen(),
        lastMoves: null
    }]);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const color = useRef<Color>('w');

    client.current.onopen = () => {
        setConnected(true);
    
        const msg = new InitMessage('TODO: MOVER ROOM ID PARA A QUERY E VALIDAR NO GAMESERVER', /*TODO: REMOVER UUID DAQUI (pode ser inferido pelo session token no server-side)*/localStorage.getItem('clientId') as string).encode();
        client.current.send(msg);
    }
    client.current.onclose = (e) => {
        setConnected(false);
        console.error(`Disconnected. Reason: ${e.reason}, code = ${e.code}`);
    }

    const updatePage = (index: number) => {
        if(index < 0 || index >= pages.current.length)
            return;
        setCurrentPage(index);
        setGameState(() => {
            return {
                allowedMoves: index === pages.current.length-1 ? color.current : 'none',
                perspective: color.current,
                fen: pages.current[index].fen,
                highlightedSquare: index === pages.current.length-1 ? highlightedSquare : null,
                lastMove: pages.current[index].lastMoves
            }
        });
    }

    const onWelcome = (msg: WelcomeMessage) => {
        color.current = msg.color as Color;
        const moveParser = new Chess();
        moveParser.loadPgn(msg.game_pgn as string);
        
        const moves = moveParser.history({
            verbose: true
        });

        game.current = new Chess();
        const initialPage = {
            move: null,
            fen: game.current.fen(),
            lastMoves: null
        } as GamePage;

        pages.current = [initialPage, ...moves.map((move, index) => {
            game.current.move(move);
            game.current.fen()
            
            return {
                move,
                fen: game.current.fen(),
                lastMoves: index === 0 ? null
                    : [move.from, move.to]
            }
        }) as GamePage[]];

        updatePage(pages.current.length-1);
    }

    client.current.onmessage = (e) => {
        const msg = JSON.parse(e.data) as IncomingMessage;
        console.log(`Received message ${msg.type}`);

        switch(msg.type) {
            case MessageType.WELCOME:
                const welcome = JSON.parse(msg.data) as WelcomeMessage
                onWelcome(welcome);
            break;
            case MessageType.PLAYER_MOVED:
                const playerMoved = JSON.parse(msg.data) as PlayerMovedMessage;
                const move = game.current.moves({verbose: true, square: playerMoved.move_s1})
                    .find(x => x.san === playerMoved.move_notation);
                if(!move) {
                    alert('Received invalid notation');
                    return;
                }
                pushMove(move);
            break;
            case MessageType.GAME_STARTED:
                alert('Game started');
                break;
            case MessageType.GAME_ENDED:

            break;
        }
    }

    const pushMove = (move: Move) => {
        game.current.move(move);
        pages.current.push({
            move,
            fen: game.current.fen(),
            lastMoves: [move.from, move.to],
        });
        updatePage(pages.current.length-1);

        const soundFile = move.isCapture() ? 'sounds/Capture.mp3' : 'sounds/Move.mp3';
        soundPlayer.current?.playSound(soundFile);
    }

    const onPlayerMove = (move: Move) => {
        if(!connected || client === null || game.current.turn() !== color.current)
            return;

        pushMove(move);
        client.current.send(new PlayerMovedMessage(move).encode());
    };

    return (
        <>
            <SoundPlayerComponent
                minDelayBetweenSounds={50}
                ref={soundPlayer}
            />

            <button onClick={() => {
                updatePage(currentPage-1);
            }}>
                Prev
            </button>
            <button onClick={() => {
                const nextState = currentPage + 1;
                if (nextState < pages.current.length) {
                    const move = pages.current[nextState].move as Move;
                    const soundFile = move.isCapture() ? 'sounds/Capture.mp3' : 'sounds/Move.mp3';
                    soundPlayer.current?.playSound(soundFile);

                    updatePage(nextState);
                }
                
            }}>
                Next
            </button>

            <DumbDisplayBoard
                boardStyle={{
                    boardBackground: 'board_bg/maple.jpg',
                    pieceStyle: 'merida', //cburnett
                    pieceSize: 60
                }}
                onPlayerMove={onPlayerMove}
                onPlayerHighlightSquare={setHighlightedSquare}
                state={gameState}
            />
        </>
    );
}
