import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { isAuthenticated } = useAuth();

    return (
        <nav className='nav'>
            <Link to="/">Home</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            {isAuthenticated ? (
                <>
                    <Link to="/dashboard">Dashboard</Link>

                </>
            ) : (
                <>
                    <Link to="/login">Login</Link>
                    <Link to="/register">Register</Link>
                </>

            )}
        </nav>
    )

}

export default Navbar;