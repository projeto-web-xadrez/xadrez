import React from 'react';
import { useAuth } from '../context/AuthContext';

const SignOutComponent: React.FC = () => {
   const { logout } = useAuth();

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: '2px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
  };

  return (
    <button style={buttonStyle} onClick={() => logout()}>
      Sign out
    </button>
  );
};

export default SignOutComponent;
