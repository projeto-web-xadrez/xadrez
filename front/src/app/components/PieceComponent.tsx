import React from 'react';
import { Color, PieceSymbol, Square } from 'chess.js'

interface PieceSettings {
    key: number,
    relativeX: number,
    relativeY: number,
    width: number,
    height: number,
    pieceStyle: string,
    type: PieceSymbol,
    square: Square,
    color: Color
};

function PieceComponent(props: PieceSettings) {
    const styles: React.CSSProperties = {
        transform: `translate(${props.relativeX}px, ${props.relativeY}px)`,
        width: props.width,
        height: props.height,
        zIndex: 2,
        position: 'absolute',
    }

    const pieceColorType: string = `${props.color}${props.type.toUpperCase()}`;
    const imageSrc = `pieces/${props.pieceStyle}/${pieceColorType}.svg`

    return (
        <img src={imageSrc} style={styles} data-square={props.square} data-piece={props.type} data-color={props.color} data-type='piece' key={props.key} draggable='false' />
    );
}

export default PieceComponent;