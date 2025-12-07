import React from 'react';
import { Move } from 'chess.js'

interface Props {
    relativeX: number,
    relativeY: number,
    width: number,
    height: number,
    move: Move,
    pieceStyle: string,
    onClick: (move: Move) => void;
};

function SquareMoveHighlightComponent(props: Props) {
    const alpha = props.move.isPromotion() ? '1' : '0.4';
    const styles: React.CSSProperties = {
        transform: `translate(${props.relativeX}px, ${props.relativeY}px)`,
        width: props.width,
        height: props.height,
        zIndex: 3,
        position: 'absolute',
        background: props.move.isCapture() ? `rgba(206, 19, 19, ${alpha})` : `rgba(0, 77, 128, ${alpha})`
    }

    const stylesPiece: React.CSSProperties = {
        transform: `translate(${props.relativeX}px, ${props.relativeY}px)`,
        width: props.width,
        height: props.height,
        zIndex: 4,
        position: 'absolute',
        cursor: 'pointer'
    }

    let promotionPiece: React.JSX.Element | null = null;
    if(props.move.isPromotion()) {
        const pieceColorType: string = `${props.move.color}${props.move?.promotion?.toUpperCase()}`;
        const imageSrc = `/pieces/${props.pieceStyle}/${pieceColorType}.svg`
        promotionPiece = <img src={imageSrc} style={stylesPiece} data-square={props.move.to} data-square-from={props.move.from} data-move={props.move.san} data-type='highlight' />
    }

    return (
    <div onClick={() => {props.onClick(props.move)}} data-square-from={props.move.from}>
        {promotionPiece}
        <img src='/transparent.png' style={styles} data-square={props.move.to} data-square-from={props.move.from} data-move={props.move.san} data-type='highlight'/>
    </div>
    );
}

export default SquareMoveHighlightComponent;