'use client';

import { useState } from 'react';
import '../styles/register-styles.css'
import { useNavigate } from 'react-router-dom';

const style: React.CSSProperties = {
    backgroundColor: 'WHITE',
};

export default function Register() {
    const navigate = useNavigate();
    const handleClick = (e: React.MouseEvent<HTMLFormElement>) => {
        // faz o request para a rota de register ou registro
        e.preventDefault() // evita q a pagina recarregue
        if(username == "" || password == "") return

        const body_obj = new FormData()
        body_obj.append("username", username)
        body_obj.append("password", password)

        fetch("http://localhost:8085/register", {
            method: "POST",
            headers: {
                //"Content-Type": "Application/JSON"
            },
            credentials: 'include',
            body: body_obj
        })
        .then(async (response) => {
            if(response.status != 200)
                alert(response.statusText);
            else {
                const data = await response.json()
                localStorage.setItem("clientId", data.data.clientId)
                navigate('/dashboard');
            } 
        }) 
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