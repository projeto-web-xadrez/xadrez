import './styles/App.css'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import { useAuth } from './context/AuthContext'
import Navbar from './components/NavbarComponent'
import Leaderboard from './pages/Leaderboard'
import Game from './pages/Game'

function App() {
  const {isAuthenticated} = useAuth()

  return (
    <div className='xadrez'>
      <Navbar/>
      <Routes>
        <Route path="/" element={
            isAuthenticated
                ? <Navigate to="/dashboard" replace />
                : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/game" element={<RequireAuth><Game /></RequireAuth>} />
        <Route path="/leaderboard" element={<Leaderboard/>}/>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
    </Routes>
    </div>
    
  )
}

export default App
