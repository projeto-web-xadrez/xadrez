import { useNavigate } from "react-router-dom";
import "../styles/saved-game-card-styles.css";
import DumbDisplayBoard from "./gameboard/DumbDisplayBoardComponent";
import { Trash2, Edit, Eye } from 'lucide-react';

export interface SavedGameCardProps {
    game_id: string,
    user_id: string,
    name: string,
    pgn: string,
    last_fen: string,
    onDelete: () => void;
    onUpdate: () => void;
}

export default function SavedGameCard(props: SavedGameCardProps) {
    const navigate = useNavigate();

    return (
        <div className='saved-game-card'>
            <div className="saved-game-card-header">
                <h3 className='saved-game-card-title'>{props.name}</h3>
                <div className="saved-game-card-buttons">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onUpdate();
                        }}
                        className="saved-game-card-edit-btn"
                        title="Edit Game"
                    >
                        <Edit className="saved-game-card-icon" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onDelete();
                        }}
                        className="saved-game-card-delete-btn"
                        title="Delete Game"
                    >
                        <Trash2 className="saved-game-card-icon" />
                    </button>
                </div>
            </div>

            <div className="saved-game-card-board-section" onClick={() => navigate(`/savedgame/${props.game_id}`)}>
                <div className="saved-game-card-board-container">
                    <DumbDisplayBoard
                        boardStyle={{
                            boardBackground: '/board_bg/maple.jpg',
                            pieceStyle: 'merida',
                            pieceSize: 20,
                            shouldLabelSquares: true
                        }}
                        state={{
                            allowedMoves: 'none',
                            fen: props.last_fen,
                            highlightedSquare: null,
                            lastMove: null,
                            perspective: 'w'
                        }}
                    />
                </div>
            </div>

            <div className="saved-game-card-footer">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/savedgame/${props.game_id}`);
                    }}
                    className="saved-game-card-view-btn"
                >
                    <Eye className="saved-game-card-icon" />
                    View Game
                </button>
            </div>
        </div>
    )
}