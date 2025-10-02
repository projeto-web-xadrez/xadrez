import React from 'react';
import { Move, Square } from 'chess.js'

interface PieceSettings {
    key: number,
    relativeX: number,
    relativeY: number,
    width: number,
    height: number,
    move: Move
};

function SquareMoveHighlightComponent(props: PieceSettings) {
    const styles: React.CSSProperties = {
        transform: `translate(${props.relativeX}px, ${props.relativeY}px)`,
        width: props.width,
        height: props.height,
        zIndex: 3,
        position: 'absolute',
        background: props.move.isCapture()  ? 'rgba(206, 19, 19, 0.4)' : 'rgba(0, 77, 128, 0.4)',
    }

    return (
        <img src='transparent.png' style={styles} data-square={props.move.to} data-square-from={props.move.from} data-move={props.move.san} data-type='highlight' key={props.key} />
    );
}

export default SquareMoveHighlightComponent;