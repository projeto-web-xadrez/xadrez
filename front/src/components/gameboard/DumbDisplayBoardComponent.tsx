
import { Chess, Move, type Color, type PieceSymbol, type Square } from 'chess.js';
import { useEffect, useMemo, useState } from 'react'
import { PieceComponent } from './PieceComponent';
import React from 'react';
import SquareMoveHighlightComponent from './SquareMoveHighlightComponent';


export interface BoardStyle {
    pieceSize: number,
    pieceStyle: string,
    boardBackground: string,
    shouldLabelSquares: boolean
}

declare type AllowMove = 'w' | 'b' | 'none' | 'both';

export interface HighlightedPieceSquareType {
    square: Square,
    type: PieceSymbol,
    color: Color,
    moves: IdentifiedMove[]
}

export interface BoardState {
    fen: string,
    perspective: Color,
    allowedMoves: AllowMove,
    lastMove: [Square, Square] | null,
    highlightedSquare: HighlightedPieceSquareType | null
}

interface DumbDisplayBoardProps {
    boardStyle: BoardStyle,
    onPlayerMove: null | ((move: Move) => void);
    onPlayerHighlightSquare: null | ((highlightedSquare: HighlightedPieceSquareType | null) => void);
    state: BoardState,
}

interface IdentifiedMove {
    key: number,
    move: Move,
}

const getRelativePositionBySquare = (square: Square, perspective: Color, boardStyle: BoardStyle) => {
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

const generateHighlightedSquareStyles = (square: Square, perspective: Color, bgColor: string, boardStyle: BoardStyle) => {
    const { relativeX, relativeY } = getRelativePositionBySquare(square, perspective, boardStyle)
    return {
        transform: `translate(${relativeX}px, ${relativeY}px)`,
        width: boardStyle.pieceSize,
        height: boardStyle.pieceSize,
        position: 'absolute',
        background: bgColor,
    } as React.CSSProperties;
}

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

// TODO: Add checked king highlight
const DumbDisplayBoard = (({ boardStyle, onPlayerMove, onPlayerHighlightSquare, state }: DumbDisplayBoardProps) => {
    if (onPlayerMove === null)
        onPlayerMove = () => { };

    if (onPlayerHighlightSquare === null)
        onPlayerHighlightSquare = () => { };

    const game = useMemo(() => new Chess(state.fen), [state.fen]);

    const pieces = useMemo(() => {
        let key = 0;
        return game.board().flat().filter(p => p !== null).map(p => {
            return {
                key: key++,
                ...p
            };
        })
    }, [state.fen]);


    const [highlightedPieceSquare, setHighlightedPieceSquare] = useState<null | HighlightedPieceSquareType>(() => {
        const highlightedPiece = state.highlightedSquare && pieces.find(p =>
            p.color === state.highlightedSquare?.color
            && p.type === state.highlightedSquare?.type
            && p.square === state.highlightedSquare?.square
        );
        if (!highlightedPiece)
            return null;
        let key = 0;
        const moves = game.moves({
            verbose: true,
            square: highlightedPiece.square
        }).map(move => { return { move, key: key++ } }) || [];

        return {
            ...highlightedPiece,
            moves,
        };
    });

    useEffect(() =>
        onPlayerHighlightSquare(highlightedPieceSquare)
        , [highlightedPieceSquare]);


    const onClickPiece = (square: Square, type: PieceSymbol, color: Color) => {
        setHighlightedPieceSquare(highlightedPieceSquare => {
            if (color !== state.allowedMoves && state.allowedMoves != 'both')
                return null;

            if (highlightedPieceSquare
                && highlightedPieceSquare.square === square
                && highlightedPieceSquare.color === color
                && highlightedPieceSquare.type === type)
                return null;

            let key = 0;
            const moves = game.moves({
                verbose: true,
                square
            }).map(move => { return { move, key: key++ } }) || [];

            return {
                color,
                square,
                type,
                moves,
            };
        });
    }

    useEffect(() => {
        if (!highlightedPieceSquare)
            return;
        const square = highlightedPieceSquare.square;

        const pieceAtSquare = game.get(square);
        if (!pieceAtSquare
            || pieceAtSquare.color !== highlightedPieceSquare.color
            || pieceAtSquare.type !== highlightedPieceSquare.type)
            setHighlightedPieceSquare(null); // If the square has changed, set highlight to null
        else {
            // We need to regenerate the highlighted moves because they may have changed
            setHighlightedPieceSquare(null);
            onClickPiece(square, pieceAtSquare.type, pieceAtSquare.color);
        }
    }, [state.fen]);

    const labels: {
        x: number,
        y: number,
        text: string,
    }[] = [];

    for (const col of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        let x = col.charCodeAt(0) - 'a'.charCodeAt(0);
        //x += 0.09 * (state.perspective === 'w' ? 1 : -1);
        labels.push({
            x: state.perspective === 'w' ? x : (7 - x),
            y: 7.7,
            text: col
        });
    }
    for (const row of ['1', '2', '3', '4', '5', '6', '7', '8']) {
        const y = row.charCodeAt(0) - '1'.charCodeAt(0);
        labels.push({
            x: 7.85,
            y: state.perspective === 'b' ? y : (7 - y),
            text: row
        });
    }

    return <div style={{
                width: 8 * boardStyle.pieceSize,
                height: 8 * boardStyle.pieceSize,
                position: 'absolute',
                margin: '0 0',
                padding: '0 0'
            }}>
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
            state.lastMove?.length === 2 ?
                <>
                    <div style={generateHighlightedSquareStyles(state.lastMove[0], state.perspective, 'rgba(155,199,0,.41)', boardStyle)}></div>
                    <div style={generateHighlightedSquareStyles(state.lastMove[1], state.perspective, 'rgba(155,199,0,.41)', boardStyle)}></div>
                </> : <></>
        }

        {
            highlightedPieceSquare ?
                <>
                    <div style={
                        generateHighlightedSquareStyles(highlightedPieceSquare.square, state.perspective, 'rgba(0, 217, 50, 0.7)', boardStyle)
                    } />

                    {highlightedPieceSquare.moves.map(({ move, key }) => <SquareMoveHighlightComponent
                        key={key}
                        move={move}
                        height={boardStyle.pieceSize}
                        width={boardStyle.pieceSize}
                        pieceStyle={boardStyle.pieceStyle}
                        onClick={(move) => {
                            setHighlightedPieceSquare(null);
                            onPlayerMove(move);
                        }}
                        {
                        ...getRelativePositionBySquare(getMoveHighlightSquare(move), state.perspective, boardStyle)
                        }
                    />
                    )}
                </> : <></>
        }

        {pieces.map(({ key, color, square, type }) => <PieceComponent
            key={key}
            color={color}
            square={square}
            type={type}
            onClick={onClickPiece}
            height={boardStyle.pieceSize}
            width={boardStyle.pieceSize}
            {...getRelativePositionBySquare(square, state.perspective, boardStyle)}
            pieceStyle={boardStyle.pieceStyle}
            showGrabIcon={state.allowedMoves === 'both' || color === state.allowedMoves}
        />)}

        {
            boardStyle.shouldLabelSquares &&
            <div style={{position: 'absolute'}}> {
                labels.map(({ x, y, text }, index) =>
                    <span key={index} style={{ 
                        position: 'absolute', 
                        transform: `translate(${x * boardStyle.pieceSize}px, ${y * boardStyle.pieceSize}px)`,
                        fontSize: boardStyle.pieceSize * 0.27,
                        color: '#2f363d',
                    }}>
                        {text}
                    </span>
                )}
            </div>
        }

    </div>
});

export default DumbDisplayBoard