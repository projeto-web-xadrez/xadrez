import React from 'react';
import { Square } from 'chess.js'

interface PieceSettings {
    key: number,
    relativeX: number,
    relativeY: number,
    width: number,
    height: number,
    squareTo: Square,
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
        background: props.isCapture  ? 'rgba(206, 19, 19, 0.4)' : 'rgba(0, 77, 128, 0.4)',
    }

    return (
        <img src='transparent.png' style={styles} data-square={props.squareTo} data-square-from={props.squareFrom} data-move={props.move} data-type='highlight' key={props.key} />
    );
}

export default SquareMoveHighlightComponent;