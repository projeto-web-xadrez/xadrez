'use client';

import { useState } from 'react';
import '../styles/register-styles.css'
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const {register} = useAuth()

    const handleClick = (e: React.MouseEvent<HTMLFormElement>) => {
        // faz o request para a rota de register ou registro
        e.preventDefault() // evita q a pagina recarregue
        if(username == "" || password == "") return

        const ok = register(username, password)
        if(!ok) {
            alert("failed to register user")
        }
    };

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    return (
        <div id='register'>
            <form onSubmit={handleClick}>
                <div id='username-div'>
                    <label htmlFor="username-field">Username</label>
                    <input type="text" id='username-field' value={username} onChange={(e) => {
                        setUsername(e.target.value)
                    }} />
                </div>
                <div id='password-div'>
                    <label htmlFor="password-field">password</label>
                    <input type="password" id='password-field' value={password} onChange={(e) => {
                        setPassword(e.target.value)
                    }} />
                </div>
                <button id='submit-register' type='submit'>Enter</button>
            </form>
            <p id="register-response"></p>
        </div>
    );
}