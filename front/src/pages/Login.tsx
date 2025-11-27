import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import '../styles/login-styles.css'
import { Link } from "react-router-dom";

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!email || !password) return;

        const ok = await login(email, password);
        if (!ok) alert("Credenciais inválidas");
    }

    return (
        <div id='login'>
            <form onSubmit={handleSubmit}>
                <div id='email-div'>
                    <label>Email</label>
                    <input type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div id='password-div'>
                    <label>Password</label>
                    <input type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                </div>

                <button id='submit-button' type="submit" disabled={!email || !password}>Enter</button>
                
                <div className="register-link">
                    <span>Don't have an account?</span>
                    <Link to="/register">Register here</Link>
                </div>
            </form>
        </div>
    );
}