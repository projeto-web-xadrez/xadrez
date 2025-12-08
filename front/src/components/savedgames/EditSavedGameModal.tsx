import { useState } from "react";
import "../../styles/edit-modal-saved-game-styles.css"

interface SavedGame {
    game_id: string,
    user_id: string,
    name: string,
    pgn: string,
    last_fen: string,
};

interface EditSavedGameModalProps {
    game: SavedGame | null
    onConfirm: ((new_pgn: string, new_name: string) => void);
    onCancel: () => void;
    error: string | null;
}

export default function EditSavedModal(props: EditSavedGameModalProps) {
    if (props.game == null) return null;

    const [currPgn, setCurrPgn] = useState<string>(props.game.pgn)
    const [currName, setCurrName] = useState<string>(props.game.name)
    const [displayErr, setDisplayErr] = useState<boolean>(false)

    return (
        <div className='edit-saved-modal-backdrop'>
            <div className='edit-saved-modal-component-div'>
                <h3 className="edit-saved-modal-title">Edit Saved Game</h3>

                <div className="edit-modal-input-body">
                    <div className="saved-game-name">
                        <label htmlFor="name-input">Game Name</label>
                        <input
                            className="pgn-input"
                            type="text"
                            id="name-input"
                            value={currName}
                            onChange={(e) => {setCurrName(e.target.value); setDisplayErr(false)}}
                        />
                    </div>

                    <div className="saved-game-pgn">
                        <label htmlFor="pgn-input">PGN</label>
                        <textarea
                            className="pgn-input"
                            id="pgn-input"
                            value={currPgn}
                            onChange={(e) => {setCurrPgn(e.target.value); setDisplayErr(false)}}
                            rows={6}
                        />
                    </div>
                </div>

                <div className="edit-modal-footer">
                    <p hidden={!displayErr} id="server-error-msg">{props.error}</p>
                    <div className="edit-modal-footer-buttons">
                        <button
                            className="edit-modal-btn edit-modal-btn-cancel"
                            onClick={props.onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            className="edit-modal-btn edit-modal-btn-confirm"
                            onClick={() => {props.onConfirm(currPgn, currName); setDisplayErr(true)}}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}