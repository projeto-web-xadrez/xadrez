import { useNavigate } from "react-router-dom";
import DumbDisplayBoard from "../gameboard/DumbDisplayBoardComponent";
import "../../styles/past-match-card-styles.css"
import ClickableUsername from "../ClickableUsernameComponent";
export interface PastMatchCardProps {
    player1: string,
    player2: string,
    player1Id: string,
    player2Id: string,
    winner: string,
    date: string,
    duration: number,
    last_fen: string,
    game_id: string
}

const durationToString = (seconds: number) => {
  let minutes = Math.floor(seconds/60);
  seconds -= minutes*60;

  const hours = Math.floor(minutes/60);
  minutes -= hours*60;

  let h = hours !== 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : '';
  let m = minutes !== 0 ? `${minutes} minute${minutes === 1 ? '' : 's'}` : '';
  const s = seconds !== 0 ? `${seconds} second${seconds === 1 ? '' : 's'}` : '';

  if(h && (m || s))
    h += ', ';
  if(m && s)
    m += ', ';
  return h+m+s;
}

export default function PastMatchCard(props: PastMatchCardProps) {
    const navigate = useNavigate();
    var d = new Date(props.date);
    const normalized_date = d.toLocaleString("pt-BR");
    return (
        <div className='past-match-card'>
            <div className="past-match-card-board-section" onClick={() => navigate(`/game/${props.game_id}`)}>
                <div className="past-match-card-board-container">
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
            <div className="past-match-card-body">
                <h3 className='past-match-card-title'>
                    <p><ClickableUsername id={props.player1Id} username={props.player1}/> vs <ClickableUsername id={props.player2Id} username={props.player2}/></p></h3>
                <p className="past-match-card-label">Duration</p>
                <p className="past-match-card-descDuration">{durationToString(props.duration)}</p>
                <p className="past-match-card-label">Match result</p>
                {(props.winner != "draw") ? 
                    (<p className="past-match-card-descWinner"><ClickableUsername overrideColor="#1ae2b0" username={props.winner} id={props.winner === props.player1 ? props.player1Id : props.player2Id}/> 🏆</p>) 
                        : 
                    (<p className="past-match-card-descDraw">Draw 🤝</p>)}
                
                <p className="past-match-card-label">Finished in</p>  
                <p className="past-match-card-descFinishDate">{normalized_date}</p>         
            </div>

            
        </div>
    )
}