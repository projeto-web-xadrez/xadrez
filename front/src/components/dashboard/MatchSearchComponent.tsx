import { useEffect, useState } from "react";
import "../../styles/match-search-component-styles.css"
interface MatchSearchProps {
    onSearch: () => void;
    onCancel: () => void;
}

export default function MatchSearchComponent(props: MatchSearchProps) {
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [seconds, setSeconds] = useState<number>(0);

    useEffect(() => {
        let interval: any;
        if (isSearching) {
            setSeconds(0);
            interval = setInterval(() => {
                setSeconds((s) => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isSearching]);

    return (
        <div className="search-match-container">
            <div className="searching-box">
                <div className="searching-header">
                    <h2 hidden={!isSearching} className="searching-title">Searching match...</h2>
                    <h2 hidden={isSearching} className="searching-title">Ready to Play?</h2>
                    <p hidden={!isSearching} className="searching-time">{seconds} seconds elapsed</p>
                </div>
                {!isSearching ? (
                    <>
                        <div className="display-board-div">
                            <img draggable="false" src="../../../public/chess_green_black.svg" alt="" />
                        </div>

                        <div className="searching-footer">
                            <button className="search-button"
                                onClick={() => {
                                    props.onSearch();
                                    setIsSearching(true);
                                }}>
                                ♘ Search Match
                            </button>
                        </div>
                    </>

                ) : (
                    <>
                        <div className="searching-loader">
                            <span className="knight-loading knight-spinpulse">♞</span>
                        </div>
                        <div className="searching-footer">
                            <button className="cancel-button"
                                onClick={() => {
                                    props.onCancel();
                                    setIsSearching(false);
                                }}>
                                Cancel
                            </button>
                        </div>
                    </>

                )}

            </div>

        </div>
    );
}
