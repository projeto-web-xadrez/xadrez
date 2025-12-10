import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/nav-bar-styles.css';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, username, clientId, logout } = useAuth();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.profile')) {
                setOpen(false);
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const handleLogout = () => {
        logout();
        setOpen(false);
        navigate('/');
    };

    return (
        <nav className='navbar'>
            <Link to="/" className="nav-brand">
                Xadrez Web
            </Link>
            
            <div className="nav-links">
                <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                    Home
                </Link>
                
                {isAuthenticated ? (
                    <>
                        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
                            Dashboard
                        </Link>
                        <Link to="/games" className={location.pathname === '/games' ? 'active' : ''}>
                            Games
                        </Link>
                        <Link to={`/profile/${clientId}`} className={location.pathname.startsWith('/profile') ? 'active' : ''}>
                            Profile
                        </Link>
                    </>
                ) : (
                    <>
                        <Link to="/login" className={location.pathname === '/login' ? 'active' : ''}>
                            Login
                        </Link>
                        <Link to="/register" className={location.pathname === '/register' ? 'active' : ''}>
                            Register
                        </Link>
                    </>
                )}
            </div>
            {isAuthenticated && (
                <div className="profile">
                    <button
                        className="profile-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(!open);
                        }}
                    >
                        {username}
                    </button>

                    <div tabIndex={-1} className={`profile-menu ${open ? "open" : ""}`}>
                        <button onClick={() => {
                            navigate(`/profile/${clientId}`);
                            setOpen(false);
                        }}>
                            Profile
                        </button>
                        <button onClick={handleLogout}>
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}

export default Navbar;