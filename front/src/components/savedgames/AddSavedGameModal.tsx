import { useState } from "react";
import "../../styles/add-saved-game-styles.css"

interface AddSavedGameModalProps {
    onConfirm: ((new_pgn:string, new_name: string) => void);
    onCancel: () => void;
    error: string | null;
}

export default function AddSavedGameModal(props: AddSavedGameModalProps) {
    const [currPgn, setCurrPgn] = useState<string>("")
    const [currName, setCurrName] = useState<string>("")
    const [displayErr, setDisplayErr] = useState<boolean>(false)

    return (
        <div className='add-saved-modal-backdrop'>
            <div className='add-saved-modal-component-div'>
                <h3 className="add-saved-modal-title">Add New Game</h3>

                <div className="add-modal-input-body">
                    <div className="saved-game-name">
                        <label htmlFor="name-input">Game Name</label>
                        <input 
                            className="pgn-input" 
                            type="text" 
                            id="name-input"
                            value={currName}
                            onChange={(e) => {
                                setCurrName(e.target.value)
                                setDisplayErr(false)
                            }}
                        />
                    </div>

                    <div className="saved-game-pgn">
                        <label htmlFor="pgn-input">PGN</label>
                        <textarea 
                            className="pgn-input" 
                            id="pgn-input"
                            value={currPgn}
                            onChange={(e) => {
                                setCurrPgn(e.target.value);
                                setDisplayErr(false)
                            }}
                            rows={6}
                        />
                    </div>
                </div>

                <div className="add-modal-footer">
                    <p hidden={!displayErr} id="server-error-msg">{props.error}</p>
                    <div className="add-modal-footer-buttons">
                        <button
                            className="add-modal-btn add-modal-btn-cancel"
                            onClick={props.onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            className="add-modal-btn add-modal-btn-confirm"
                            onClick={() => {
                                props.onConfirm(currPgn, currName)
                                setDisplayErr(true)
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}