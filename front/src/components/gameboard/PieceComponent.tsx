import React from 'react';
import { type Color, type PieceSymbol, type Square } from 'chess.js'

export interface PieceComponentProps {
    relativeX: number,
    relativeY: number,
    width: number,
    height: number,
    pieceStyle: string,
    type: PieceSymbol,
    square: Square,
    color: Color,
    showGrabIcon: boolean,
    onClick: (square: Square, type: PieceSymbol, color: Color) => void,
};

export function PieceComponent(props: PieceComponentProps) {
    const styles: React.CSSProperties = {
        transform: `translate(${props.relativeX}px, ${props.relativeY}px)`,
        width: props.width,
        height: props.height,
        zIndex: 2,
        position: 'absolute',
    }
    if(props.showGrabIcon)
        styles.cursor = 'grab';

    const pieceColorType: string = `${props.color}${props.type.toUpperCase()}`;
    const imageSrc = `/pieces/${props.pieceStyle}/${pieceColorType}.svg`

    return (
        <img onClick={() => props.onClick(props.square, props.type, props.color)} src={imageSrc} style={styles} data-square={props.square} data-piece={props.type} data-color={props.color} data-type='piece' draggable='false' />
    );
}
