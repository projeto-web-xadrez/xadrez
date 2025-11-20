import './App.css'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import { useAuth } from './context/AuthContext'

function App() {
  const {isAuthenticated} = useAuth()

  return (
    <div className='xadrez'>
      <Routes>
        <Route path="/" element={
            isAuthenticated
                ? <Navigate to="/dashboard" replace />
                : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
    </Routes>
    </div>
    
  )
}

export default App
