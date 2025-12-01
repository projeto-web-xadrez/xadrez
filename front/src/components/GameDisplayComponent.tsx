import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import DumbDisplayBoard, { type BoardState, type BoardStyle, type HighlightedPieceSquareType } from './DumbDisplayBoardComponent';
import { Chess, Move, type Color, type Square } from 'chess.js';
import SoundPlayerComponent, { type SoundPlayerHandle } from './SoundPlayerComponent';

declare type DisplayType = 'playing' | 'spectating';

interface GameDisplaySettings {
    pgn: string | null,
    type: DisplayType,
    perspective: Color,
    playerColor: Color | null,
    boardStyle: BoardStyle,
    onPlayerMove: null | ((move: Move) => void),
    onPageChanged: null | ((page: number) => void),
};

interface GamePage {
    move: Move | null,
    lastMoves : [Square, Square] | null
    fen: string
}

export interface GameDisplayHandle {
    pushMove: (move: Move | {
        move_s1: Square;
        move_s2: Square;
        move_notation: string;
    }) => void;
    playSound: (src: string) => void;
}

const GameDisplayComponent = forwardRef<GameDisplayHandle, GameDisplaySettings>((props, ref) => {
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
    
    const pages = useRef<GamePage[]>([{
        move: null,
        fen: new Chess().fen(),
        lastMoves: null
    }]);

    const [currentPage, setCurrentPage] = useState<number>(0);

    const pushMove = (move: Move | {
        move_s1: Square;
        move_s2: Square;
        move_notation: string;
    }) => {
        let parsedMove: Move;
        if(move instanceof Move)
            parsedMove = move;
        else parsedMove = game.current.moves({verbose: true, square: move.move_s1})
            .find(x => x.san === move.move_notation) as Move;
        
        game.current.move(parsedMove);
        pages.current.push({
            move: parsedMove,
            fen: game.current.fen(),
            lastMoves: [parsedMove.from, parsedMove.to],
        });
        updatePage(pages.current.length-1);

        const soundFile = parsedMove.isCapture() ? 'sounds/Capture.mp3' : 'sounds/Move.mp3';
        soundPlayer.current?.playSound(soundFile);
    };

    useImperativeHandle(ref, () => ({
        pushMove,
        playSound: (src) => {
            soundPlayer.current?.playSound(src);
        }
    }));
    
    const updatePage = (index: number) => {
        if(index < 0 || index >= pages.current.length)
            return;

        setCurrentPage(index);
        if(props?.onPageChanged)
            props.onPageChanged(index);

        const allowedMoves = index === pages.current.length-1 && props.playerColor && props.type === 'playing' 
            ? props.playerColor : 'none';

        setGameState(() => {
            return {
                allowedMoves,
                perspective: props.perspective,
                fen: pages.current[index].fen,
                highlightedSquare: index === pages.current.length-1 ? highlightedSquare : null,
                lastMove: pages.current[index].lastMoves
            }
        });
    }

    const onPlayerMove = (move: Move) => {
        if(game.current.turn() !== props.playerColor || props.type !== 'playing')
            return;

        pushMove(move);
        if(props.onPlayerMove)
            props.onPlayerMove(move);
    };

    useEffect(() => {
        if(!props.pgn)
            return;

        const moveParser = new Chess();
        moveParser.loadPgn(props.pgn);
        
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
    }, [props.pgn]);

    if(!props.pgn)
        return (
            <div>
                <SoundPlayerComponent
                    minDelayBetweenSounds={50}
                    ref={soundPlayer}
                />
                <DumbDisplayBoard
                    boardStyle={props.boardStyle}
                    onPlayerHighlightSquare={null}
                    onPlayerMove={null}
                    state={{
                        allowedMoves: 'none',
                        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                        highlightedSquare: null,
                        lastMove: null,
                        perspective: 'w'
                    }}
                />
            </div>
        );

    return (
        <div>
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
                boardStyle={props.boardStyle}
                onPlayerMove={onPlayerMove}
                onPlayerHighlightSquare={setHighlightedSquare}
                state={gameState}
            />
        </div>
    );
});

export default GameDisplayComponent;
