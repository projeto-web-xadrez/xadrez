import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import DumbDisplayBoard, { type BoardState, type BoardStyle, type HighlightedPieceSquareType } from './DumbDisplayBoardComponent';
import { Chess, Move, type Color, type Square } from 'chess.js';
import { type SoundPlayerHandle } from '../SoundPlayerComponent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faFlag, faRotate } from '@fortawesome/free-solid-svg-icons';

import '../../styles/GameDisplay.css';

declare type DisplayType = 'playing' | 'spectating';

interface GameDisplaySettings {
    pgn: string | null,
    type: DisplayType,
    perspective: Color,
    playerColor: Color | null,
    boardStyle: BoardStyle,
    soundPlayer: RefObject<SoundPlayerHandle | null>,
    onPlayerMove: null | ((move: Move) => void),
    onPageChanged: null | ((page: number) => void),
};

interface GamePage {
    move: Move | null,
    lastMoves: [Square, Square] | null
    fen: string
}

export interface GameDisplayHandle {
    pushMove: (move: Move | {
        move_s1: Square;
        move_s2: Square;
        move_notation: string;
    }) => void;
}

const GameDisplayComponent = forwardRef<GameDisplayHandle, GameDisplaySettings>((props, ref) => {
    const game = useRef<Chess>(new Chess());
    const divRef = useRef<HTMLDivElement | null>(null);
    const moveListRef = useRef<HTMLDivElement | null>(null);

    const [gameState, setGameState] = useState<BoardState>({
        allowedMoves: 'none',
        fen: new Chess().fen(),
        highlightedSquare: null,
        lastMove: null,
        perspective: props.perspective || 'w'
    });

    const [highlightedSquare, setHighlightedSquare] = useState<HighlightedPieceSquareType | null>(null);

    const [pages, setPages] = useState<GamePage[]>([{
        move: null,
        fen: new Chess().fen(),
        lastMoves: null
    }]);

    const [currentPage, setCurrentPage] = useState<number>(0);

    const scrollQueue = useRef<[number, number][]>([]);

    useEffect(() => {
        if (scrollQueue.current.length === 0)
            return;

        let [pageIndex, time] = scrollQueue.current[scrollQueue.current.length - 1];
        scrollQueue.current = [];

        if (new Date().getTime() - time >= 200)
            return;

        const firstMoveCell = moveListRef.current?.firstChild as (HTMLElement | undefined | null);
        if (!moveListRef.current || !firstMoveCell) return;

        const listHeight = moveListRef.current.clientHeight;
        const elementTop = firstMoveCell.clientHeight * Math.floor((pageIndex - 3) / 2);

        const targetScroll =
            elementTop - listHeight / 2 + firstMoveCell.clientHeight / 2;

        moveListRef.current.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });

    }, [gameState]);

    const pushMove = (move: Move | {
        move_s1: Square;
        move_s2: Square;
        move_notation: string;
    }) => {
        let parsedMove: Move;
        if (move instanceof Move)
            parsedMove = move;
        else parsedMove = game.current.moves({ verbose: true, square: move.move_s1 })
            .find(x => x.san === move.move_notation) as Move;

        game.current.move(parsedMove);
        const newPages = [...pages, {
            move: parsedMove,
            fen: game.current.fen(),
            lastMoves: [parsedMove.from, parsedMove.to],
        } as GamePage];

        setPages(newPages);
        updatePageNoState(newPages, newPages.length - 1, true);
    };

    useImperativeHandle(ref, () => ({
        pushMove
    }));

    const updatePage = (index: number, shouldScroll: boolean) => updatePageNoState(pages, index, shouldScroll);
    const updatePageNoState = (pages: GamePage[], index: number, shouldScroll: boolean) => {
        if (index < 0 || index >= pages.length)
            return;

        if (index >= currentPage) {
            const move = pages[index].move;
            if(move) {
                const soundFile = move.isCapture() ? '/sounds/Capture.mp3' : '/sounds/Move.mp3';
                props.soundPlayer.current?.playSound(soundFile);
            }
        }

        setCurrentPage(index);
        if (props?.onPageChanged)
            props.onPageChanged(index);

        const allowedMoves = index === pages.length - 1 && props.playerColor && props.type === 'playing'
            ? props.playerColor : 'none';

        setGameState((prev) => {
            return {
                allowedMoves,
                perspective: (prev?.lastMove && prev?.perspective) || props.perspective,
                fen: pages[index].fen,
                highlightedSquare: index === pages.length - 1 ? highlightedSquare : null,
                lastMove: pages[index].lastMoves
            }
        });

        if (shouldScroll)
            scrollQueue.current.push([index, new Date().getTime()]);
    }

    const onPlayerMove = (move: Move) => {
        if (game.current.turn() !== props.playerColor || props.type !== 'playing')
            return;

        pushMove(move);
        if (props.onPlayerMove)
            props.onPlayerMove(move);
    };

    useEffect(() => {
        divRef.current?.focus();
        if (!props.pgn)
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

        const newPages = [initialPage, ...moves.map((move) => {
            game.current.move(move);
            game.current.fen()

            return {
                move,
                fen: game.current.fen(),
                lastMoves: [move.from, move.to]
            }
        }) as GamePage[]];

        setPages(newPages);
        updatePageNoState(newPages, newPages.length - 1, true);
    }, [props.pgn]);

    const prevPage = () => updatePage(currentPage - 1, true);
    const nextPage = () => updatePage(currentPage + 1, true);

    const switchPerspective = () => setGameState(state => {
        return {
            ...state,
            perspective: state.perspective === 'w' ? 'b' : 'w'
        }
    });

    const onKeyDown: React.KeyboardEventHandler = (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevPage();
        }
        else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextPage();
        }
    }

    const getPagesGrouped = () => {
        type MoveDescription = {
            move: string,
            page: number,
        }
        const groups = [] as [MoveDescription, MoveDescription | null][];

        for (let i = 1; i < pages.length; i++) {
            if (i % 2 === 1)
                groups.push([{ page: i, move: pages[i].move?.san as string }, null]);
            else
                groups[Math.floor(i / 2 - 1)][1] = { page: i, move: pages[i].move?.san as string };
        }
        return groups;
    }

    if (!props.pgn)
        return (
            <div>
                <DumbDisplayBoard
                    boardStyle={props.boardStyle}
                    onPlayerHighlightSquare={null}
                    onPlayerMove={null}
                    state={{
                        allowedMoves: 'none',
                        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                        highlightedSquare: null,
                        lastMove: null,
                        perspective: props.perspective || 'w'
                    }}
                />
            </div>
        );

    return (
        <div ref={divRef} onKeyDown={onKeyDown} tabIndex={-1} className='root-container'>
            <div>
                <DumbDisplayBoard
                    boardStyle={props.boardStyle}
                    onPlayerMove={onPlayerMove}
                    onPlayerHighlightSquare={setHighlightedSquare}
                    state={gameState}
                />
            </div>

            <div
                tabIndex={-1}
                className='moves-container'
                style={{
                    transform: `translateX(${props.boardStyle.pieceSize * 8}px)`,
                    width: '400px',
                    height: `${props.boardStyle.pieceSize * 8}px`,
                    maxHeight: `${props.boardStyle.pieceSize * 8}px`,
                }}
            >
                <div
                    className='move-list'
                    tabIndex={-1}
                    style={{
                        height: `${props.boardStyle.pieceSize * 8 - 41}px`,
                        maxHeight: `${props.boardStyle.pieceSize * 8 - 41}px`,
                    }}
                    ref={moveListRef}
                >
                    {getPagesGrouped().map((p, index) => {
                        const move1Selected = p[0].page === currentPage;
                        const move2Selected = p[1]?.page === currentPage;

                        return (
                            <div key={index} className='move-row'>
                                <div className='move-index'>{index + 1}</div>

                                <div
                                    onClick={() => !move1Selected && updatePage(p[0].page, false)}
                                    className={`move-cell ${move1Selected ? 'selected' : 'hoverable'}`}
                                >
                                    {p[0].move}
                                </div>

                                <div
                                    onClick={() => p[1] && !move2Selected && updatePage(p[1].page, false)}
                                    className={`move-cell ${move2Selected ? 'selected' : 'hoverable'}`}
                                    style={{ opacity: p[1] ? 1 : 0.4 }}
                                >
                                    {p[1]?.move}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className='moves-footer'>
                    <button tabIndex={-1} onClick={prevPage} className='footer-btn'>
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>

                    <button tabIndex={-1} onClick={nextPage} className='footer-btn'>
                        <FontAwesomeIcon icon={faArrowRight} />
                    </button>

                    <button tabIndex={-1} onClick={switchPerspective} className='footer-btn flip'>
                        <FontAwesomeIcon icon={faRotate} />
                    </button>

                    <button tabIndex={-1} className='footer-btn resign'>
                        <FontAwesomeIcon icon={faFlag} style={{ paddingRight: '4px' }} />
                        Resign
                    </button>
                </div>
            </div>
        </div>

    );
});

export default GameDisplayComponent;
