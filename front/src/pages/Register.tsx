import { useState, useEffect } from 'react';
import '../styles/register-styles.css'
import { useAuth } from '../context/AuthContext';
import * as z from 'zod';
import { Link } from 'react-router-dom';

export default function Register() {
    const VerificationCodeSchema = z.string().length(6).regex(/^\d+$/);

    const RegistrationInputSchema = z.object({
        username: z.string()
            .regex(/^[a-zA-Z]/, 'Username must start with a letter')
            .regex(/^[a-zA-Z0-9_]*$/, 'Username can only contain letters, numbers, and underscores')
            .min(3, 'Username must be at least 3 characters long')
            .max(20, 'Username must be at most 20 characters'),
        email: z.email('Invalid email format').trim(),
        password: z.string()
            .min(8, 'Password must be at least 8 characters long')
            .refine((password) => /[A-Z]/.test(password), {
                message: 'Password must contain at least one uppercase letter'
            })
            .refine((password) => /\d/.test(password), {
                message: 'Password must contain at least one digit'
            })
            .refine((password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), {
                message: 'Password must contain at least one symbol'
            })
    });

    const { register, confirmRegistration } = useAuth();
    const [shouldConfirmCode, setShouldConfirmCode] = useState<boolean>(false);

    const [username, setUsername] = useState<string>("");
    const [verifCode, setVerifCode] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [passwordConfirmation, setPasswordConfirmation] = useState<string>("");

    const [validationErrors, setValidationErrors] = useState<Map<string, string[]>>(new Map());
    const [serverError, setServerError] = useState<string>("");
    const [isFormValid, setIsFormValid] = useState<boolean>(false);
    const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

    const allFieldsTouched = () => {
        const requiredFields = ['username', 'email', 'password', 'passwordConfirmation'];
        return requiredFields.every(field => touchedFields.has(field));
    };

    const handleRegistrationError = (message: string) => {
        setEmail("")
        setUsername("")
        setPassword("")
        setPasswordConfirmation("")
        setServerError(message)
        setTouchedFields(new Set())
    }

    const handleConfirmRegistrationError = (message: string) => {
        setVerifCode("")
        setServerError(message)
    }

    const handleFieldChange = (fieldName: string, value: string) => {
        setTouchedFields(prev => new Set(prev).add(fieldName));
        setServerError("")
        switch (fieldName) {
            case 'username':
                setUsername(value);
                break;
            case 'email':
                setEmail(value);
                break;
            case 'password':
                setPassword(value);
                break;
            case 'passwordConfirmation':
                setPasswordConfirmation(value);
                break;
        }
    };

    useEffect(() => {
        const validateForm = () => {
            const validationRes = RegistrationInputSchema.safeParse({
                username,
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
            if(validData) {
                setUsername(validData.username);
                setPassword(validData.password);
                setEmail(validData.email);
            }

            // Password must match its confirmation (not checked by zod)
            if (touchedFields.has('passwordConfirmation') && password !== passwordConfirmation)
                causes.set('passwordConfirmation', ['Passwords do not match']);

            setValidationErrors(causes);
            setIsFormValid(causes.size === 0 && password === passwordConfirmation && allFieldsTouched());
        };

        validateForm();
    }, [username, email, password, passwordConfirmation, touchedFields]);

    const handleClick = async (e: React.MouseEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!isFormValid)
            return;

        setServerError("")
        const [ok, message] = await register(username, password, email)
        setShouldConfirmCode(ok)

        if(!ok) {
            handleRegistrationError(message)
        }
    };

    const handleConfirmation = async (e: React.MouseEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (verifCode === "") return

        setServerError("")
        const [ok, message] = await confirmRegistration(verifCode)
        if (!ok) {
            handleConfirmRegistrationError(message)
        }
    };

    const getFieldValidationClass = (fieldName: string): string => {
        if (!touchedFields.has(fieldName))
            return '';

        const errors = validationErrors.get(fieldName);
        if (errors && errors.length > 0)
            return 'invalid';

        return 'valid';
    };

    const shouldShowErrors = (fieldName: string): boolean => {
        return touchedFields.has(fieldName);
    };

    return (
        <div id='register'>
            {/* FORM DE REGISTRO */}
            <form hidden={shouldConfirmCode} onSubmit={handleClick}>
                <p id="server-error-msg">{serverError}</p>
                <div id='username-div'>
                    <label htmlFor="username-field">Username</label>
                    <input
                        type="text"
                        id='username-field'
                        value={username}
                        onChange={(e) => handleFieldChange('username', e.target.value)}
                        className={getFieldValidationClass('username')}
                    />
                    {shouldShowErrors('username') && validationErrors.get('username') && (
                        <div className="validation-errors">
                            {validationErrors.get('username')?.map((error, index) => (
                                <span key={index} className="error-message">• {error}</span>
                            ))}
                        </div>
                    )}
                </div>

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

                <div id='password-confirmation-div'>
                    <label htmlFor="password-confirmation-field">Password Confirmation</label>
                    <input
                        type="password"
                        id='password-confirmation-field'
                        value={passwordConfirmation}
                        onChange={(e) => handleFieldChange('passwordConfirmation', e.target.value)}
                        className={getFieldValidationClass('passwordConfirmation')}
                    />
                    {shouldShowErrors('passwordConfirmation') && validationErrors.get('passwordConfirmation') && (
                        <div className="validation-errors">
                            {validationErrors.get('passwordConfirmation')?.map((error, index) => (
                                <span key={index} className="error-message">• {error}</span>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    id='submit-register'
                    className='submit-button'
                    type='submit'
                    disabled={!isFormValid}
                >
                    Register
                </button>

                <div className="login-link">
                    <span>Already have an account?</span>
                    <Link to="/login">Login here</Link>
                </div>

            </form>

            {/* FORM DE CONFIRMAÇÃO */}
            <form hidden={!shouldConfirmCode} onSubmit={handleConfirmation}>
                <p id="server-error-msg">{serverError}</p>
             <p className="verification-notice">
                Verification code sent to {email}
            </p>

            <div id='verification-code-div'>
                <label htmlFor="verification-code-field">Verification code</label>
                <input
                    type="text"
                    id='verification-code-field'
                    value={verifCode}
                    onChange={(e) => {setServerError(""); setVerifCode(e.target.value)}}
                />
            </div>

            <button 
                id='submit-confirmation' 
                type='submit' 
                className='submit-button' 
                disabled={!VerificationCodeSchema.safeParse(verifCode).success}>
                Confirm Code
            </button>
        </form>

        </div>
    );
}