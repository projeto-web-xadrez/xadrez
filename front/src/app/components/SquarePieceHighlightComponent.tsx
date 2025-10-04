import React from 'react';
import { Move, Square } from 'chess.js'

interface Props {
    relativeX: number,
    relativeY: number,
    width: number,
    height: number,
};

function SquarePieceHighlightComponent(props: Props) {
    const styles: React.CSSProperties = {
        transform: `translate(${props.relativeX}px, ${props.relativeY}px)`,
        width: props.width,
        height: props.height,
        position: 'absolute',
        background: 'rgba(0, 217, 50, 0.7)',
    }

    return (
        <div style={styles} />
    );
}

export default SquarePieceHighlightComponent;