import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/nav-bar-styles.css'

function Navbar() {
    const navigate = useNavigate();
    const { isAuthenticated, username, clientId, logout } = useAuth();
    const [open, setOpen] = useState(false);

    return (
        <nav className='navbar'>
            <div className="nav-links">
                <Link to="/">Home</Link>
                {isAuthenticated ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/games">Games</Link>
                        <Link to={`/profile/${clientId}`}>My Profile</Link>
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
                        <button onClick={() => {
                            navigate(`/profile/${clientId}`);
                            setOpen(false);
                        }}>Profile</button>
                        <button onClick={logout}>Sign Out</button>
                    </div>
                </div>
            )}
        </nav>
    )

}

export default Navbar;