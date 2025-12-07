import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/nav-bar-styles.css'

function Navbar() {
    const { isAuthenticated, username, logout } = useAuth();
    const [open, setOpen] = useState(false);

    return (
        <nav className='navbar'>
            <div className="nav-links">
                <Link to="/">Home</Link>
                <Link to="/leaderboard">Leaderboard</Link>
                {isAuthenticated ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/games">Games</Link>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register">Register</Link>
                    </>

                )}
            </div>
            {isAuthenticated && (
                <div className="profile">
                    <button
                        className="profile-btn"
                        onClick={() => setOpen(!open)}
                    >
                        {username}
                    </button>

                    <div className={`profile-menu ${open ? "open" : ""}`}>
                        <button onClick={logout}>Sign Out</button>
                    </div>
                </div>
            )}
        </nav>
    )

}

export default Navbar;