import React from 'react';
import { useNavigate } from 'react-router-dom';

interface GameEndedProps {
  playerId: string;
  winner: string;
}

const GameEndedComponent: React.FC<GameEndedProps> = ({ playerId, winner }) => {
  const isWinner = playerId === winner;
  const navigate = useNavigate()

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const boxStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    width: '300px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: isWinner ? '#1e7e34' : '#c82333',
    marginBottom: '20px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <h2 style={{ marginBottom: '10px' }}>Partida Encerrada</h2>
        <p style={messageStyle}>
          {isWinner ? 'Você venceu! 🏆' : 'Você perdeu 😢'}
        </p>
        <button style={buttonStyle} onClick={() => {
          navigate("/")
          /* setIsPlaying(false)
          setGameEnded(false)
          setWinner(null) */
        }}>
          Voltar para o menu
        </button>
      </div>
    </div>
  );
};

export default GameEndedComponent;
