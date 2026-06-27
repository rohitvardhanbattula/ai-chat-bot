import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    authRegister, authLogin, authVerifyOTP,
    setAccessToken, setRefreshToken, setStoredUsername, isLoggedIn
} from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Building2, Loader2 } from 'lucide-react';

const ALLOWED_DOMAIN   = '@answerthink.com';
const OTP_TTL_SECONDS  = 600;

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [step,     setStep]     = useState<1 | 2>(1);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [otp,      setOtp]      = useState('');
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [timeLeft, setTimeLeft] = useState(OTP_TTL_SECONDS);
    const navigate = useNavigate();

    // Redirect if already authenticated
    useEffect(() => {
        if (isLoggedIn()) navigate('/', { replace: true });
    }, [navigate]);

    // OTP countdown
    useEffect(() => {
        if (step !== 2) return;
        if (timeLeft <= 0) {
            setError('Verification code expired. Please register again.');
            setStep(1);
            return;
        }
        const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(id);
    }, [step, timeLeft]);

    const formatTime = (s: number) =>
        `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    /** Store the token pair returned by login/verifyOTP */
    function handleAuthTokens(tokens: any, un: string) {
        setAccessToken(tokens.accessToken, tokens.expiresIn);
        setRefreshToken(tokens.refreshToken);
        setStoredUsername(un.trim().toLowerCase());
    }

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmedUser = username.trim().toLowerCase();

        if (!trimmedUser.endsWith(ALLOWED_DOMAIN)) {
            return setError(`Must use an ${ALLOWED_DOMAIN} email address.`);
        }

        setLoading(true);
        try {
            if (isRegistering && step === 1) {
                await authRegister({ username: trimmedUser, password });
                setStep(2);
                setTimeLeft(OTP_TTL_SECONDS);

            } else if (isRegistering && step === 2) {
                const tokens = await authVerifyOTP({ username: trimmedUser, otp });
                handleAuthTokens(tokens, trimmedUser);
                navigate('/', { replace: true });

            } else {
                const tokens = await authLogin({ username: trimmedUser, password });
                handleAuthTokens(tokens, trimmedUser);
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    }, [username, password, otp, isRegistering, step, navigate]);

    const switchMode = () => {
        setIsRegistering(r => !r);
        setStep(1);
        setError('');
        setOtp('');
    };

    const title = isRegistering
        ? (step === 1 ? 'Create Account' : 'Verify Your Email')
        : 'Welcome Back';

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/30">
            <div className="w-full max-w-md p-4">
                <div className="flex flex-col items-center mb-8 gap-3">
                    <Building2 className="w-10 h-10 text-primary" />
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight">Enterprise AI Hub</h1>
                        <p className="text-sm text-muted-foreground mt-1">Powered by AnswerThink</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-center text-lg">{title}</CardTitle>
                    </CardHeader>

                    <form onSubmit={handleSubmit} noValidate>
                        <CardContent className="space-y-4">
                            {step === 1 && (
                                <>
                                    <Input
                                        type="email"
                                        placeholder={`Work email (${ALLOWED_DOMAIN})`}
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        autoComplete="email"
                                        required
                                        disabled={loading}
                                    />
                                    <Input
                                        type="password"
                                        placeholder={isRegistering ? 'Password (min 8 characters)' : 'Password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                        minLength={isRegistering ? 8 : 1}
                                        required
                                        disabled={loading}
                                    />
                                </>
                            )}

                            {step === 2 && isRegistering && (
                                <div className="space-y-3">
                                    <p className="text-sm text-center text-muted-foreground">
                                        We sent a 6-digit code to <strong>{username.trim()}</strong>.
                                    </p>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                        autoComplete="one-time-code"
                                        required
                                        disabled={loading}
                                        className="text-center text-xl tracking-[0.5em] font-mono"
                                    />
                                    <p className={`text-xs text-center font-mono ${timeLeft < 60 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                        Code expires in {formatTime(timeLeft)}
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="text-sm font-medium text-destructive text-center bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2" role="alert">
                                    {error}
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-col gap-3">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading
                                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Please wait…</>
                                    : isRegistering
                                        ? (step === 1 ? 'Send Verification Code' : 'Verify & Sign In')
                                        : 'Sign In'}
                            </Button>

                            {step === 1 && (
                                <Button type="button" variant="link" className="text-muted-foreground text-sm" onClick={switchMode}>
                                    {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                                </Button>
                            )}
                            {step === 2 && (
                                <Button type="button" variant="link" className="text-sm" onClick={() => { setStep(1); setError(''); }}>
                                    ← Back
                                </Button>
                            )}
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
