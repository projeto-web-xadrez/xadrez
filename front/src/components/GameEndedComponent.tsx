import React from 'react';
import '../styles/game-ended-styles.css';

interface GameEndedProps {
  playerId: string;
  winner: string;
  onClose: () => void;
}

const GameEndedComponent: React.FC<GameEndedProps> = ({ playerId, winner, onClose }) => {
  const isWinner = winner !== 'draw' && playerId === winner;
  const isDraw = winner === 'draw';

  return (
    <div className="game-ended-backdrop">
      <div className="game-ended-modal">
        <h2 className="game-ended-title">Match Ended</h2>
        
        <div className="game-ended-body">
          <p className={`game-ended-message ${isDraw ? 'draw' : isWinner ? 'winner' : 'loser'}`}>
            {isDraw ? 'It\'s a tie!' : isWinner ? 'You won! 🏆' : 'You lost 😢'}
          </p>
        </div>
        
        <div className="game-ended-footer">
          <button 
            className={`game-ended-btn  ${isDraw ? 'draw-btn' : isWinner ? 'winner-btn' : 'loser-btn'}`}
            onClick={onClose}
          >
            Watch the game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameEndedComponent;