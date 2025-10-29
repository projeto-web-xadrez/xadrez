'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../styles/login-styles.css';


const style: React.CSSProperties = {
    backgroundColor: 'WHITE',


};
export default function Login() {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLFormElement>) => {
        // faz o request para a rota de login ou registro
        e.preventDefault() // evita q a pagina recarregue
        if(username == "" || password == "") return

        const body_obj = new FormData()
        body_obj.append("username", username)
        body_obj.append("password", password)
    
        fetch("http://localhost:8085/login", {
            method: "POST",
            headers: {
                //"Content-Type": "Application/JSON"
            },
            credentials: 'include',
            body: body_obj
        })
        .then(async (response) => {
            if(response.status === 200) {
                const data = await response.json()
                localStorage.setItem("clientId", data.data.clientId)
                router.push('/dashboard');
            }
                
            else alert(response.statusText);
        })        
    };

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    return (
        <div id='login'>
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
                <button id='submit-login' type='submit'>Enter</button>
            </form>
            <p id="login-response"></p>
        </div>
    );
}