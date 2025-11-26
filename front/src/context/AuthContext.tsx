'use client'

import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

type AuthContextType = {
    isAuthenticated: boolean;
    username: string | null;
    clientId: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    register: (username: string, password: string, email: string) => Promise<boolean>;
    confirm_registration: (validation_code: string) => Promise<boolean>;
    checkValidToken: () => Promise<boolean>
    logout: () => void;
};

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const savedUser = localStorage.getItem("username");
    const savedId = localStorage.getItem("clientId");
    const csrf = Cookies.get("csrf_token");

    const [username, setUsername] = useState<string | null>(savedUser);
    const [clientId, setClientId] = useState<string | null>(savedId);

    const [isAuthenticated, setAuthenticated] = useState(() => {
        return !!(csrf && savedUser && savedId);
    });


    // Carregar autenticação via cookie + localStorage ao iniciar
    useEffect(() => {
        const csrf = Cookies.get("csrf_token");
        const savedUser = localStorage.getItem("username");
        const savedId = localStorage.getItem("clientId");

        if (csrf && savedUser && savedId) {
            setAuthenticated(true);
            setUsername(savedUser);
            setClientId(savedId);
        }
    }, []);

    async function login(username: string, password: string) {
        const body = new FormData();
        body.append("username", username);
        body.append("password", password);

        const res = await fetch("http://localhost:80/loginapi/login", {
            method: "POST",
            credentials: "include",
            body
        });

        if (res.status === 200) {
            const data = await res.json();
            localStorage.setItem("clientId", data.data.clientId);
            localStorage.setItem("username", username);

            setUsername(username);
            setClientId(data.data.clientId);
            setAuthenticated(true);

            navigate("/dashboard");
            return true;
        }

        return false;
    }

    async function register(username: string, password: string, email: string) {
        const body_obj = new FormData()
        body_obj.append("username", username)
        body_obj.append("password", password)
        body_obj.append("email", email)

        const response = await fetch("http://localhost:80/loginapi/register", {
            method: "POST",
            headers: {
                //"Content-Type": "Application/JSON"
            },
            credentials: 'include',
            body: body_obj
        })
        if (response.status !== 200) {
            return false;
        }

        const data = await response.json();
        if(data.Type == "result") {
            localStorage.setItem("verificationToken", data.verificationToken)
        }
        return true;
    }

     async function confirm_registration(validation_code: string) {
        const body_obj = new FormData()


        const verification_token = localStorage.getItem("verificationToken") as string || ""
        body_obj.append("verificationCode", validation_code)
        body_obj.append("verificationToken", verification_token)

        const response = await fetch("http://localhost:80/loginapi/confirm-registration", {
            method: "POST",
            headers: {
                //"Content-Type": "Application/JSON"
            },
            credentials: 'include',
            body: body_obj
        })
        if (response.status !== 200) {
            return false;
        }

        const data = await response.json();

        localStorage.setItem("clientId", data.data.clientId);
        localStorage.setItem("username", data.data.username);

        setUsername(data.data.username);
        setClientId(data.data.clientId);
        setAuthenticated(true);

        navigate('/dashboard');
        return true;
    }

    function logout() {
        localStorage.removeItem("clientId");
        localStorage.removeItem("username");
        Cookies.remove("csrf_token");

        setAuthenticated(false);
        setUsername(null);
        setClientId(null);
        navigate("/login");
    }

    async function checkValidToken() {
        const response = await fetch("http://localhost:80/loginapi/validate-session", {
            method: "POST",
            headers: {
                //"Content-Type": "Application/JSON"
            },
            credentials: 'include',
        })
        if (response.status !== 200) {
            logout()
            return false;
        } else {
            return true;
        }
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, username, clientId, login, register, confirm_registration, checkValidToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
