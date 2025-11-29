
import { Chess, Move, type Color, type PieceSymbol, type Square } from 'chess.js';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { PieceComponent, type PieceComponentProps } from './PieceComponent';
import React from 'react';
import SquareMoveHighlightComponent from './SquareMoveHighlightComponent';


interface BoardStyle {
    pieceSize: number,
    pieceStyle: string,
    boardBackground: string
}

interface DumbDisplayBoardProps {
    boardStyle: BoardStyle,
    onPlayerMove: (move: Move) => void;
}

export interface DumbDisplayBoardHandle {
    setFen: (fen: string, perspective: Color, allowMovesColor: string) => void;
    setLastMove: (squares: [Square, Square] | null) => void;
    setBoardStyle: (boardStyle: BoardStyle) => void;
}

interface IdentifiedMove {
    key: number,
    move: Move,
}

interface IdentifiedPieceComponentProps {
    key: number,
    square: Square,
    type: PieceSymbol,
    color: Color,
    onClick: (square: Square, type: PieceSymbol, color: Color) => void,
    showGrabIcon: boolean,
}

interface HighlightedPieceSquareType {
    square: Square,
    type: PieceSymbol,
    color: Color,
    moves: IdentifiedMove[]
}

const getRelativePositionBySquare = (square: Square, perspective: string, boardStyle: BoardStyle) => {
    let column = square.charCodeAt(0) - ('a'.charCodeAt(0));
    let row = 7 - (square.charCodeAt(1) - ('1'.charCodeAt(0)));

    if (perspective === 'b') {
        column = 7 - column;
        row = 7 - row;
    }

    return {
        relativeX: boardStyle.pieceSize * column,
        relativeY: boardStyle.pieceSize * row,
    }
}

const generateHighlightedSquareStyles = (square: Square, perspective: string, color: string, boardStyle: BoardStyle) => {
    const { relativeX, relativeY } = getRelativePositionBySquare(square, perspective, boardStyle)
    return {
        transform: `translate(${relativeX}px, ${relativeY}px)`,
        width: boardStyle.pieceSize,
        height: boardStyle.pieceSize,
        position: 'absolute',
        background: color,
    } as React.CSSProperties;
}

const DumbDisplayBoard = forwardRef<DumbDisplayBoardHandle, DumbDisplayBoardProps>((props, ref) => {
    const [boardStyle, setBoardStyle] = useState<BoardStyle>(props.boardStyle);
    
    const [pieces, setPieces] = useState<IdentifiedPieceComponentProps[]>([]);
    const [highlightedPieceSquare, setHighlightedPieceSquare] = useState<null | HighlightedPieceSquareType>();
    const [perspective, setPerspective] = useState<string>('');
    const [lastMove, setLastMove] = useState<[Square, Square] | null>(null);
    const playerColor = useRef<string>('');
    const gameState = useRef<Chess | null>(null);

    const onClickPiece = (square: Square, type: PieceSymbol, color: Color) =>
        setHighlightedPieceSquare(highlightedPieceSquare => {
            if (gameState === null)
                return null;

            if (color !== playerColor.current)
                return null;

            if (highlightedPieceSquare
                && highlightedPieceSquare.square === square
                && highlightedPieceSquare.color === color
                && highlightedPieceSquare.type === type)
                return null;

            let key = 0;
            const moves = gameState.current?.moves({
                verbose: true,
                square
            }).map(move => { return { move, key: key++ } }) || [];

            return {
                color,
                square,
                type: type,
                moves,
            };
        });

    useImperativeHandle(ref, () => ({
        setBoardStyle,
        setFen: (fen: string, perspective: string, allowMovesColor: string) => {
            playerColor.current = allowMovesColor;
            setPerspective(perspective);
            gameState.current = new Chess(fen);

            const pieces = [];

            const squares = gameState.current.board();
            let id = 1;
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const square = squares[i][j];

                    if (square === null) continue;


                    pieces.push(
                        {
                            key: id++,
                            onClick: onClickPiece,
                            showGrabIcon: playerColor.current === square.color,
                            ...square
                        }
                    );
                }
            }
            setPieces(pieces);

            if (highlightedPieceSquare) {
                const square = highlightedPieceSquare.square;

                const pieceAtSquare = gameState.current.get(square);
                if (!pieceAtSquare
                    || pieceAtSquare.color !== highlightedPieceSquare.color
                    || pieceAtSquare.type !== highlightedPieceSquare.type)
                    setHighlightedPieceSquare(null); // If the square has changed, set highlight to null
                else {
                    // We need to regenerate the highlighted moves because they may have changed
                    setHighlightedPieceSquare(null);
                    onClickPiece(square, pieceAtSquare.type, pieceAtSquare.color);
                }

            }
        },
        setLastMove,
    }))

    const getMoveHighlightSquare = (move: Move): Square => {
        if (!move.isPromotion())
            return move.to;

        const piece = move.promotion as 'q' | 'b' | 'n' | 'r';
        const offset = {
            'q': 0,
            'b': 1,
            'n': 2,
            'r': 3
        }[piece];

        const row = (move.to.charCodeAt(1) - '0'.charCodeAt(0))
            + (move.color === 'b' ? offset : -offset);

        const newSquare = move.to[0] + row as Square;
        return newSquare;
    }

    return <div>
        <img src={boardStyle.boardBackground}
            style={{
                width: 8 * boardStyle.pieceSize,
                height: 8 * boardStyle.pieceSize,
                position: 'absolute'
            }}
            data-type='board'
            draggable='false'
            onClick={() => setHighlightedPieceSquare(null)}
        />
        {
            lastMove  ?
                <>
                    <div style={generateHighlightedSquareStyles(lastMove[0], perspective, 'rgba(155,199,0,.41)', boardStyle)}></div>
                    <div style={generateHighlightedSquareStyles(lastMove[1], perspective, 'rgba(155,199,0,.41)', boardStyle)}></div>
                </> : <></>
        }

        {
            highlightedPieceSquare ?
                <>
                    <div style={
                        generateHighlightedSquareStyles(highlightedPieceSquare.square, perspective, 'rgba(0, 217, 50, 0.7)', boardStyle)
                    } />

                    {highlightedPieceSquare.moves.map(({ move, key }) => <SquareMoveHighlightComponent
                        key={key}
                        move={move}
                        height={boardStyle.pieceSize}
                        width={boardStyle.pieceSize}
                        pieceStyle={boardStyle.pieceStyle}
                        onClick={(move) => {
                            setHighlightedPieceSquare(null);
                            props.onPlayerMove(move);
                        }}
                        {
                        ...getRelativePositionBySquare(getMoveHighlightSquare(move), perspective, boardStyle)
                        }
                    />
                    )}
                </> : <></>
        }

        {pieces.map(({ key, color, square, type, onClick, showGrabIcon }) => <PieceComponent
            key={key}
            color={color}
            square={square}
            type={type}
            onClick={onClick}
            height={boardStyle.pieceSize}
            width={boardStyle.pieceSize}
            {...getRelativePositionBySquare(square, perspective, boardStyle)}
            pieceStyle={boardStyle.pieceStyle}
            showGrabIcon={showGrabIcon}
        />)}

    </div>
});

export default DumbDisplayBoard