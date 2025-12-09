import { useEffect, useState } from "react";

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
            
            {!isSearching ? (
                <button className="search-button"
                    onClick={() => {
                        props.onSearch();
                        setIsSearching(true);
                    }}>
                    ♘ Search Match
                </button>
            ) : (
                <div className="searching-box">

                    <div className="searching-header">
                        <h2 className="searching-title">Searching...</h2>
                        <p className="searching-time">{seconds}s elapsed</p>
                    </div>

                    <div className="searching-loader">
                        <span className="knight-loading">♞</span>
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
                </div>
            )}
        </div>
    );
}
