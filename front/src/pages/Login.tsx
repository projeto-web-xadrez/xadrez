import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import '../styles/login-styles.css'
import * as z from 'zod'
import { Link } from "react-router-dom";

export default function Login() {

    const LoginInputSchema = z.object({
        email: z.email('Invalid email format').trim(),
        password: z.string()
                    .min(8, 'Password must be at least 8 characters long')
    });

    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [validationErrors, setValidationErrors] = useState<Map<string, string[]>>(new Map());
    const [isFormValid, setIsFormValid] = useState<boolean>(false);
    const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

    const allFieldsTouched = () => {
        const requiredFields = ['email', 'password'];
        return requiredFields.every(field => touchedFields.has(field));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!isFormValid)
            return;

        const ok = await login(email, password);
        if (!ok) alert("Credenciais inválidas");
    }

    const handleFieldChange = (fieldName: string, value: string) => {
        setTouchedFields(prev => new Set(prev).add(fieldName));
        switch (fieldName) {
            case 'email':
                setEmail(value);
                break;
            case 'password':
                setPassword(value);
                break;
        }
    };

    useEffect(() => {
        const validateForm = () => {
            const validationRes = LoginInputSchema.safeParse({
                email,
                password
            });

            const causes = new Map<string, string[]>();
            validationRes.error?.issues?.forEach(i => {
                const key = i.path.toString();

                if (touchedFields.has(key)) {
                    if (causes.get(key) === undefined)
                        causes.set(key, [i.message]);
                    else causes.get(key)?.push(i.message);
                }
            });

            const validData = validationRes.data;
            if (validData) {
                setPassword(validData.password);
                setEmail(validData.email);
            }

            setValidationErrors(causes);
            setIsFormValid(causes.size === 0 && allFieldsTouched());
        };
        validateForm();
    }, [email, password, touchedFields]);


    const shouldShowErrors = (fieldName: string): boolean => {
        return touchedFields.has(fieldName);
    };

     const getFieldValidationClass = (fieldName: string): string => {
        if (!touchedFields.has(fieldName))
            return '';

        const errors = validationErrors.get(fieldName);
        if (errors && errors.length > 0)
            return 'invalid';

        return 'valid';
    };

    return (
        <div id='login'>
            <form onSubmit={handleSubmit}>
                <div id='email-div'>
                    <label htmlFor="email-field">Email</label>
                    <input
                        type="email"
                        id='email-field'
                        value={email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className={getFieldValidationClass('email')}
                    />
                    {shouldShowErrors('email') && validationErrors.get('email') && (
                        <div className="validation-errors">
                            {validationErrors.get('email')?.map((error, index) => (
                                <span key={index} className="error-message">• {error}</span>
                            ))}
                        </div>
                    )}
                </div>

                <div id='password-div'>
                    <label htmlFor="password-field">Password</label>
                    <input
                        type="password"
                        id='password-field'
                        value={password}
                        onChange={(e) => handleFieldChange('password', e.target.value)}
                        className={getFieldValidationClass('password')}
                    />
                    {shouldShowErrors('password') && validationErrors.get('password') && (
                        <div className="validation-errors">
                            {validationErrors.get('password')?.map((error, index) => (
                                <span key={index} className="error-message">• {error}</span>
                            ))}
                        </div>
                    )}
                </div>

                <button id='submit-button' type="submit" disabled={!isFormValid}>Enter</button>

                <div className="register-link">
                    <span>Don't have an account?</span>
                    <Link to="/register">Register here</Link>
                </div>
            </form>
        </div>
    );
}