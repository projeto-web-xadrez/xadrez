import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import { useAuth } from './context/AuthContext'
import Navbar from './components/NavbarComponent'
import Game from './pages/Game'
import Games from './pages/Games'
import type { SoundPlayerHandle } from './components/SoundPlayerComponent'
import { useEffect, useRef, useState } from 'react'
import SoundPlayerComponent from './components/SoundPlayerComponent'
import SavedGame from './pages/SavedGame'
import Profile from './pages/Profile'
import Home from './pages/Home'

export interface BoardStyle {
  background: string, piece: string
}

function App() {
  const soundPlayer = useRef<SoundPlayerHandle>(null);
  const {isAuthenticated} = useAuth()

  useEffect(() => {
    if(!localStorage.getItem('background'))
      localStorage.setItem('background', 'maple');
    if(!localStorage.getItem('piece'))
        localStorage.setItem('piece', 'merida');
  }, []);
  

  const [style, setStyle] = useState<BoardStyle>({
    background: localStorage.getItem('background') ? `/board_bg/${localStorage.getItem('background')}.jpg` : '/board_bg/maple.jpg',
    piece: localStorage.getItem('piece') || 'merida'
  });

  return (
    <>
      <SoundPlayerComponent
          minDelayBetweenSounds={50}
          ref={soundPlayer}
      />
      <div className='xadrez'>
        <Navbar onUpdateSettings={(background, piece) => {
          setStyle({
            background: `/board_bg/${background}.jpg`,
            piece
          });
        }}/>
        <Routes>
          <Route path="/" element={
              isAuthenticated
                  ? <Navigate to="/dashboard" replace />
                  : <Home/>}  />
          <Route path="/dashboard" element={<RequireAuth><Dashboard boardStyle={style} soundPlayer={soundPlayer}/></RequireAuth>} />
          <Route path="/game/:gameId" element={<RequireAuth><Game boardStyle={style} soundPlayer={soundPlayer}/></RequireAuth>} />
          <Route path="/games" element={<RequireAuth><Games boardStyle={style}/></RequireAuth>} />
          <Route path="/savedgame/:gameId" element={<RequireAuth><SavedGame boardStyle={style} soundPlayer={soundPlayer}/></RequireAuth>} />
          <Route path="/profile/:id" element={<RequireAuth><Profile boardStyle={style}/></RequireAuth>} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
      </Routes>
      </div>
    </>
    
  )
}

export default App
