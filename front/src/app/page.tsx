'use client'
import './styles/main-styles.css'
import {redirect} from 'next/navigation'

export default function Home() {
  return (
    <div>
      <p>Main page</p>
      <button id="sign-in" onClick={() => redirect('/login')}>Entrar</button>
      <button id="sign-up" onClick={() => redirect('/register')}>Cadastrar</button>
    </div>
  )
}