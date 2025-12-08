import { useState } from "react";
import "../../styles/import-lichess-modal-styles.css"

interface ImportLichessModalProps {
    onConfirm: ((username: string, maxGames: number) => void);
    onCancel: () => void;
    error: string | null;
}

export default function ImportlLichessModal(props: ImportLichessModalProps) {
    const [username, setUsername] = useState<string>("")
    const [maxGames, setMaxGames] = useState<number>(5)
    const [displayErr, setDisplayErr] = useState<boolean>(false)

    return (
        <div className='import-lichess-modal-backdrop'>
            <div className='import-lichess-modal-component-div'>
                <h3 className="import-lichess-modal-title">Import Games From Lichess</h3>

                <div className="import-lichess-input-body">
                    <div className="saved-game-name">
                        <label htmlFor="name-input">Lichess Username</label>
                        <input
                            className="pgn-input"
                            type="text"
                            id="name-input"
                            value={username}
                            onChange={(e) => {setUsername(e.target.value); setDisplayErr(false)}}
                        />
                    </div>

                    <div className="import-lichess-maxGames">
                        <label htmlFor="max-games">Max Games: {maxGames}</label>
                        <div className="import-lichess-maxGames-input-container">
                            <input
                                type="range"
                                className="import-lichess-slider"
                                id="max-games"
                                value={maxGames}
                                max={20}
                                min={1}
                                onChange={(e) => {setMaxGames(Number(e.target.value)); setDisplayErr(false)}}
                            />
                        </div>
                    </div>
                </div>

                <div className="import-lichess-footer">
                    <p hidden={!displayErr} id="server-error-msg">{props.error}</p>
                    <div className="import-lichess-footer-buttons">
                        <button
                            className="import-lichess-btn import-lichess-btn-cancel"
                            onClick={props.onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            className="import-lichess-btn import-lichess-btn-confirm"
                            onClick={() => {props.onConfirm(username, maxGames); setDisplayErr(true)}}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}