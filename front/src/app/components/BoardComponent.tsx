'use client';

import { useState } from 'react';
import { Chess, Move, Square } from 'chess.js'
import PieceComponent from './PieceComponent';
import SquareMoveHighlightComponent from './SquareMoveHighlightComponent';
import SquareLastMoveComponent from './SquareLastMoveComponent';
import SquareCheckedKingComponent from './SquareCheckedKingComponent';

const DEFAULT_BOARD_BG = 'board_bg/maple.jpg'
const DEFAULT_PIECE_STYLE = 'merida'; //cburnett

const getRelativePositionBySquare = (square: Square, perspective: string) => {
    let column = square.charCodeAt(0) - ('a'.charCodeAt(0));
    let row = 7 - (square.charCodeAt(1) - ('1'.charCodeAt(0)));

    if (perspective === 'b') {
        column = 7 - column;
        row = 7 - row;
    }

    return {
        relativeX: 50 * column,
        relativeY: 50 * row,
    }
}

const regeneratePieces = (chess: Chess, perspective: string) => {
    const pieces = [];
    const squares = chess.board();
    let id = 1;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = squares[i][j];

            if (square === null) continue;

            const perspectiveRow =
                perspective === 'w' ?
                    i : 7 - i;

            const perspectiveColumn =
                perspective === 'w' ?
                    j : 7 - j;

            pieces.push(
                PieceComponent({
                    key: id++,
                    pieceStyle: DEFAULT_PIECE_STYLE,
                    relativeX: 50 * perspectiveColumn,
                    relativeY: 50 * perspectiveRow,
                    width: 50,
                    height: 50,
                    ...square
                })
            );
        }
    }

    return pieces;
}

interface BoardProps {
    gameState: any;
    sendMove: (move: Move) => void;
    chessBoard: React.RefObject<Chess>;
}

function Board({ sendMove, gameState, chessBoard }: BoardProps) {
    const style: React.CSSProperties = {
        width: '400px',
        height: '400px'
    };

    const [currentHighlights, setCurrentHighlights] = useState<Array<any>>([]);

    const currentPieces = regeneratePieces(chessBoard.current, gameState.color);
    const lastMoves = chessBoard.current.moveNumber() === 1 ? [] : [SquareLastMoveComponent({
        key: 0,
        color: 'rgba(155,199,0,.41)',
        height: 50,
        width: 50,
        ...getRelativePositionBySquare(gameState.last_move_s1, gameState.color)
    }),
    SquareLastMoveComponent({
        key: 1,
        color: 'rgba(155,199,0,.41)',
        height: 50,
        width: 50,
        ...getRelativePositionBySquare(gameState.last_move_s2, gameState.color)
    })
    ]

    const checkedKing = chessBoard.current.isCheck() ?
        SquareCheckedKingComponent({
            key: 0,
            color: 'rgba(199,0,0,.61)',
            height: 50,
            width: 50,
            ...getRelativePositionBySquare(chessBoard.current.findPiece({
                color: chessBoard.current.turn(),
                type: 'k'
            })[0], gameState.color)
        })
        : null;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!(e.target instanceof HTMLImageElement))
            return;

        const element: HTMLImageElement = e.target;
        const type = element.dataset.type;

        if (!type || type === 'board' || !element.dataset.square) {
            setCurrentHighlights([]);
            return;
        }

        const square: Square = element.dataset.square as Square;

        if (type === 'highlight') {
            const move = chessBoard.current.moves({
                verbose: true,
                square: element.dataset['square-from'] as Square
            }).find(m => m.san === element.dataset.move) as Move;
            setCurrentHighlights([]);
            sendMove(move);
            return;
        }

        if (type === 'piece') {
            if (element.dataset.color !== gameState.color || (gameState.color !== chessBoard.current.turn())) {
                setCurrentHighlights([]);
                return;
            }

            if(currentHighlights.length != 0 && currentHighlights[0].props['data-square-from'] === element.dataset.square) {
                setCurrentHighlights([]);
                return;
            }

            let id = 0;
            const highlights = chessBoard.current.moves({ square, verbose: true }).map(
                move => SquareMoveHighlightComponent({
                    key: id++,
                    move,
                    ...getRelativePositionBySquare(move.to, gameState.color),
                    height: 50,
                    width: 50
                })
            );
            setCurrentHighlights(highlights);
            return;
        }
    };

    return (
        <div style={style} onClick={handleClick}>
            <img src={DEFAULT_BOARD_BG}
                style={{
                    width: '400px',
                    height: '400px',
                    position: 'absolute'
                }}
                data-type='board'
                draggable='false'
            />
            {lastMoves}
            {currentPieces}
            {currentHighlights}
            {checkedKing}
        </div>
    );
}

export default Board;