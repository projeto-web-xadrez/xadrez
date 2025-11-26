import { useState } from 'react';
import '../styles/register-styles.css'
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const { register, confirm_registration } = useAuth()
    const [shouldConfirmCode, setShouldConfirmCode] = useState<boolean>(false)

    const [username, setUsername] = useState<string>("");
    const [verifCode, setVerifCode] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleClick = async (e: React.MouseEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (username === "" || password === "" || email === "") return

        const ok = await register(username, password, email)
        setShouldConfirmCode(ok)
    };

    const handleConfirmation = async (e: React.MouseEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (verifCode === "") return

        const ok = await confirm_registration(verifCode)
        if (!ok) {
            alert("failed to confirm")
        }
    };

    return (
        <div id='register'>
            {/* FORM DE REGISTRO */}
            <form hidden={shouldConfirmCode} onSubmit={handleClick}>
                <div id='username-div'>
                    <label htmlFor="username-field">Username</label>
                    <input
                        type="text"
                        id='username-field'
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div id='email-div'>
                    <label htmlFor="email-field">Email</label>
                    <input
                        type="email"
                        id='email-field'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div id='password-div'>
                    <label htmlFor="password-field">Password</label>
                    <input
                        type="password"
                        id='password-field'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button id='submit-register' type='submit'>Enter</button>
            </form>

            {/* FORM DE CONFIRMAÇÃO */}
            <form hidden={!shouldConfirmCode} onSubmit={handleConfirmation}>
                <div id='verification-code-div'>
                    <label htmlFor="verification-code-field">Verification code</label>
                    <input
                        type="text"
                        id='verification-code-field'
                        value={verifCode}           
                        onChange={(e) => setVerifCode(e.target.value)}
                    />
                </div>

                <button id='submit-confirmation' type='submit'>
                    Confirm code
                </button>
            </form>

            <p id="register-response"></p>
        </div>
    );
}