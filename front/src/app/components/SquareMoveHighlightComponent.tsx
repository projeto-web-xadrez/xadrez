import React from 'react';
import { Square } from 'chess.js'

interface PieceSettings {
    key: number,
    relativeX: number,
    relativeY: number,
    width: number,
    height: number,
    square: Square,
    squareFrom: Square,
    isCapture: boolean,
    move: string
};

function SquareMoveHighlightComponent(props: PieceSettings) {
    const styles: React.CSSProperties = {
        transform: `translate(${props.relativeX}px, ${props.relativeY}px)`,
        width: props.width,
        height: props.height,
        zIndex: 3,
        position: 'absolute',
        border: '1px solid ' + (props.isCapture ? 'red' : 'green')
    }

    return (
        <img src='transparent.png' style={styles} data-square={props.square} data-square-from={props.squareFrom} data-move={props.move} data-type='highlight' key={props.key} />
    );
}

export default SquareMoveHighlightComponent;