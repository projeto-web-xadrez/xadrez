
import '../../styles/match-history-list-styles.css'
import PastMatchCard, {type PastMatchCardProps} from './PastMatchCardComponent'

interface MatchHistoryListProps {
  games: PastMatchCardProps[];
}

export default function MatchHistoryList({ games }: MatchHistoryListProps) {
  return (
    <div className="match-history-card-container">
        <div className='match-container-header'>
            <h2 className="match-container-title">Match History</h2>
        </div>
        

      {games.length === 0 ? (
        <div className="match-history-card-empty">
          <div className="match-history-card-empty-icon">♔</div>
          <p className="match-history-card-empty-text">No past games found</p>
          <p className="match-history-card-empty-subtext">Play your first match to display it here!</p>
        </div>
      ) : (
        <div className="match-history-card-grid">
          {games.map((game) => (
            <div key={game.game_id} className="match-history-card-item">
              <PastMatchCard
                {...game}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};