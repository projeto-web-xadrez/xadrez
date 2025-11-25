import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import '../styles/login-styles.css'


export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!username || !password) return;

        const ok = await login(username, password);
        if (!ok) alert("Credenciais inválidas");
    }

    return (
        <div id='login'>
            <form onSubmit={handleSubmit}>
                <div id='username-div'>
                    <label>Username</label>
                    <input type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)} />
                </div>

                <div id='password-div'>
                    <label>Password</label>
                    <input type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                </div>

                <button type="submit">Enter</button>
            </form>
        </div>
    );
}
