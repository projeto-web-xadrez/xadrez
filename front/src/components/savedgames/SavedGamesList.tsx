
import '../../styles/Games.css'
import SavedGameCard from './SavedGameCardComponent'

interface SavedGame {
  game_id: string,
  user_id: string,
  name: string,
  pgn: string,
  last_fen: string,
};


interface GameListProps {
  games: SavedGame[];
  onDelete: (game: SavedGame) => void;
  onUpdate: (game: SavedGame) => void;
  onAddGame: () => void;
}

export default function GameList({ games, onDelete, onUpdate, onAddGame }: GameListProps) {
  return (
    <div className="game-card-container">
      <div className="game-card-header">
        <h2 className="game-card-title">Saved Games</h2>
        <div className="game-card-header-right">
          <div className="game-card-count">
            {games.length} {games.length === 1 ? 'Game' : 'Games'}
          </div>
          <button
            className="game-card-add-btn"
            onClick={onAddGame}
            title="Add New Game"
          >
            Add Game
          </button>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="game-card-empty">
          <div className="game-card-empty-icon">♔</div>
          <p className="game-card-empty-text">No saved games yet</p>
          <p className="game-card-empty-subtext">Add a new game to see it here</p>
        </div>
      ) : (
        <div className="game-card-grid">
          {games.map((game) => (
            <div key={game.game_id} className="game-card-item">
              <SavedGameCard
                {...game}
                onDelete={() => onDelete(game)}
                onUpdate={() => onUpdate(game)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};