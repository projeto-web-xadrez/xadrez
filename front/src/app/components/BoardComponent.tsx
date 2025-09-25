'use client';

import React from 'react';
import { Chess, Square } from 'chess.js'
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

function Board() {
    const style: React.CSSProperties = {
        width: '400px',
        height: '400px'
    };

    const [chessBoard, setChessBoard] = React.useState<Chess>(new Chess('1nbqkb1r/1pp1pppp/r4n2/p2P4/8/PP1P4/2P2PPP/RNBQKBNR b KQk - 0 5'));
    const [playerColor, setPlayerColor] = React.useState<string>('b');
    const [currentHighlights, setCurrentHighlights] = React.useState<Array<any>>([]);
    const [currentPieces, setCurrentPieces] = React.useState<Array<any>>(regeneratePieces(chessBoard, playerColor));
    const [lastMoves, setLastMoves] = React.useState<Array<any>>([]);
    const [checkedKing, setCheckedKing] = React.useState<any>(null);


    const performMove = (squareFrom: Square, squareTo: Square, move: string) => {
        // TODO: remover esta linha (apenas para fins de testes)
        const newPlayerColor = playerColor === 'w' ? 'b' : 'w';
        setPlayerColor(newPlayerColor);
        setCurrentHighlights([]);

        // Mover com o "move" pode ser ambíguo, melhor mover com squares (from e to)
        //chessBoard.move(move);
        chessBoard.move({
            from: squareFrom,
            to: squareTo
        });

        // TODO: remover console.log
        console.log('\n' + chessBoard.ascii())
        console.log(chessBoard.fen())

        // aplica highlight na posicao anterior e na nova posição da peça movida pelo adversário
        setLastMoves(
            [SquareLastMoveComponent({
                key: 0,
                color: 'rgba(155,199,0,.41)',
                height: 50,
                width: 50,
                ...getRelativePositionBySquare(squareFrom, newPlayerColor)
            }),
            SquareLastMoveComponent({
                key: 1,
                color: 'rgba(155,199,0,.41)',
                height: 50,
                width: 50,
                ...getRelativePositionBySquare(squareTo, newPlayerColor)
            })
            ]
        );

        if (move.endsWith('+') || move.endsWith('#')) {
            const enemyKingSquare = chessBoard.findPiece({
                color: newPlayerColor,
                type: 'k'
            })[0];

            setCheckedKing(SquareCheckedKingComponent({
                key: 0,
                color: 'rgba(199,0,0,.61)',
                height: 50,
                width: 50,
                ...getRelativePositionBySquare(enemyKingSquare, newPlayerColor)
            }));
        } else setCheckedKing(null);

        setChessBoard(chessBoard);
        const newPieces = regeneratePieces(chessBoard, newPlayerColor);
        setCurrentPieces(newPieces);
    }

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
            const squareFrom: Square = element.dataset.squareFrom as Square;
            const move = element.dataset.move as string;

            /*
            // Acredito que não seja mais necessário (agora que utilizamos squares para mover, nunca será ambíguo)
            // Isto é para assegurar que o lance não é ambíguo válido
            // Exemplo: nd7 neste FEN: "1nbqkb1r/1pp1pppp/r4n2/p2P4/8/PP1P4/2P2PPP/RNBQKBNR b KQk - 0 5"
            // Não tenho certeza se quebra algum outro lance, acredito que não, mas deve ser testado
            let newMove = move;
            if(!newMove.startsWith('O-O')) // Caso não seja roque
                newMove = 
                    (move.startsWith(squareFrom) ? 'p' : move[0]) + squareFrom + (move.includes('x') ? 'x' : '') + square
                    + (move.endsWith('+') || move.endsWith('#') ? move.slice(-1) : '');*/

            performMove(squareFrom, square, move);
            return;
        }

        if (type === 'piece') {
            if (element.dataset.color !== playerColor) {
                setCurrentHighlights([]);
                return;
            }

            let id = 0;
            const highlights = chessBoard.moves({ square }).map(
                move => {
                    const isCheck = ['#', '+'].includes(move.slice(-1));

                    let moveSquare: Square;
                    if (['O-O', 'O-O-O', 'O-O+', 'O-O-O+'].includes(move)) {
                        const column = move.startsWith('O-O-') ? 'c' : 'g';
                        const row = playerColor === 'w' ? '1' : '8';
                        moveSquare = (column + row) as Square;
                    } else moveSquare =
                        (isCheck ? move.slice(-3).slice(0, -1) // Lance com xeque (elimina último caractere)
                            : move.slice(-2).toLowerCase()) as Square;

                    const pieceAtMoveSquare = chessBoard.get(moveSquare);
                    const isCapture =
                        pieceAtMoveSquare !== undefined // Captura comum
                        || (element.dataset.piece === 'p' && move.includes('x')); // En passant 

                    return SquareMoveHighlightComponent({
                        key: id++,
                        square: moveSquare,
                        squareFrom: square,
                        move,
                        isCapture,
                        ...getRelativePositionBySquare(moveSquare, playerColor),
                        height: 50,
                        width: 50
                    })

                }
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