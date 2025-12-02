'use client'

import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type AuthContextType = {
    isAuthenticated: boolean;
    username: string | null;
    clientId: string | null;
    email: string | null;
    login: (username: string, password: string) => Promise<[boolean, string]>;
    register: (username: string, password: string, email: string) => Promise<[boolean, string]>;
    confirmRegistration: (validationCode: string) => Promise<[boolean, string]>;
    checkValidToken: () => Promise<boolean>
    logout: () => void;
};

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const savedUser = localStorage.getItem("username");
    const savedEmail = localStorage.getItem("email");
    const savedId = localStorage.getItem("clientId");

    const [username, setUsername] = useState<string | null>(savedUser);
    const [email, setEmail] = useState<string | null>(savedEmail);
    const [clientId, setClientId] = useState<string | null>(savedId);

    const [isAuthenticated, setAuthenticated] = useState(() => {
        const csrf = localStorage.getItem("csrf_token");
        return !!(csrf && savedUser && savedId);
    });


    // Carregar autenticação via cookie + localStorage ao iniciar
    useEffect(() => {
        const csrf = localStorage.getItem("csrf_token");
        const savedUser = localStorage.getItem("username");
        const savedId = localStorage.getItem("clientId");
        const savedEmail = localStorage.getItem("email");

        if (csrf && savedUser && savedId && savedEmail) {
            setAuthenticated(true);
            setUsername(savedUser);
            setEmail(savedEmail);
            setClientId(savedId);
        }
    }, []);

    async function login(email: string, password: string): Promise<[boolean, string]> {
        const body = new FormData();
        body.append("email", email);
        body.append("password", password);

        const res = await fetch("/loginapi/login", {
            method: "POST",
            credentials: "include",
            body
        });

        if (res.status === 200) {
            const { data } = await res.json();
            localStorage.setItem("clientId", data.clientId);
            localStorage.setItem("username", data.username);
            localStorage.setItem("email", data.email);
            localStorage.setItem("csrf_token", data.csrfToken)
            
            setUsername(data.username);
            setEmail(data.email);
            setClientId(data.clientId);
            setAuthenticated(true);

            //navigate("/dashboard");
            return [true, ""];
        }

        return [false, await res.text()];
    }

    async function register(username: string, password: string, email: string): Promise<[boolean, string]>  {
        const body_obj = new FormData()
        body_obj.append("username", username)
        body_obj.append("password", password)
        body_obj.append("email", email)

        const response = await fetch("/loginapi/register", {
            method: "POST",
            headers: {
                //"Content-Type": "Application/JSON"
            },
            credentials: 'include',
            body: body_obj
        })

        if (response.status !== 200) {
            return [false, await response.text()];
        }

        const json_res = await response.json();

        if(json_res.type == "result") {
            localStorage.setItem("verificationToken", json_res.data.verificationToken)
        }
        return [true, ""];
    }

     async function confirmRegistration(validationCode: string): Promise<[boolean, string]> {
        const body_obj = new FormData()

        const verification_token = localStorage.getItem("verificationToken") as string || ""
        body_obj.append("verificationCode", validationCode)
        body_obj.append("verificationToken", verification_token)

        const response = await fetch("/loginapi/confirm-registration", {
            method: "POST",
            headers: {
                //"Content-Type": "Application/JSON"
            },
            credentials: 'include',
            body: body_obj
        })

        if (response.status !== 200) {
            return [false, await response.text()];
        }

        const { data } = await response.json();

        localStorage.setItem("clientId", data.clientId);
        localStorage.setItem("username", data.username);
        localStorage.setItem("email", data.email);
        localStorage.setItem("csrf_token", data.csrfToken)

        setUsername(data.username);
        setEmail(data.username);
        setClientId(data.clientId);
        setAuthenticated(true);

        //navigate('/dashboard');
        return [true, ""];
    }

    function logout() {
        localStorage.removeItem("clientId");
        localStorage.removeItem("email");
        localStorage.removeItem("verificationToken");
        localStorage.removeItem("username");
        localStorage.removeItem("csrf_token");

        setAuthenticated(false);
        setUsername(null);
        setEmail(null);
        setClientId(null);
        navigate("/login");
    }

    async function checkValidToken() {
        const response = await fetch("/loginapi/validate-session", {
            method: "POST",
            headers: {
                //"Content-Type": "Application/JSON"
                "X-CSRF-Token": localStorage.getItem("csrf_token") || "",

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
        <AuthContext.Provider value={{ isAuthenticated, username, clientId, email, login, register, confirmRegistration: confirmRegistration, checkValidToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
