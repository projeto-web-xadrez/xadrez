import React from 'react';

interface SquareSettings {
    key: number,
    relativeX: number,
    relativeY: number,
    width: number,
    height: number,
    color: string
}

function SquareLastMoveComponent(props: SquareSettings) {
    const styles: React.CSSProperties = {
        transform: `translate(${props.relativeX}px, ${props.relativeY}px)`,
        background: props.color,
        width: props.width,
        height: props.height,
        position: 'absolute',
        zIndex: 1
    }

    return (
        <div style={styles}/>
    );
}

export default SquareLastMoveComponent;