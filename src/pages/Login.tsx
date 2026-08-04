import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    authRegister, authLogin, authVerifyOTP,
    authForgotPassword, authResetPassword,
    setAccessToken, setRefreshToken, setStoredUsername, isLoggedIn
} from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Building2, Loader2 } from 'lucide-react';

const ALLOWED_DOMAIN   = '@answerthink.com';
const OTP_TTL_SECONDS  = 600;

type Mode = 'login' | 'register' | 'forgotPassword' | 'forgotOTP' | 'resetPassword';

export default function Login() {
    const [mode,        setMode]        = useState<Mode>('login');
    const [step,        setStep]        = useState<1 | 2>(1);   // for register OTP step
    const [username,    setUsername]    = useState('');
    const [password,    setPassword]    = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [otp,         setOtp]         = useState('');
    const [error,       setError]       = useState('');
    const [info,        setInfo]        = useState('');
    const [loading,     setLoading]     = useState(false);
    const [timeLeft,    setTimeLeft]    = useState(OTP_TTL_SECONDS);
    const navigate = useNavigate();

    // Redirect if already authenticated
    useEffect(() => {
        if (isLoggedIn()) navigate('/', { replace: true });
    }, [navigate]);

    // OTP countdown — active during register OTP step and forgotOTP mode
    const otpActive = (mode === 'register' && step === 2) || mode === 'forgotOTP';
    useEffect(() => {
        if (!otpActive) return;
        if (timeLeft <= 0) {
            setError('Verification code expired. Please try again.');
            if (mode === 'register') { setStep(1); setMode('register'); }
            else setMode('forgotPassword');
            return;
        }
        const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(id);
    }, [otpActive, timeLeft, mode]);

    const formatTime = (s: number) =>
        `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    function handleAuthTokens(tokens: any, un: string) {
        setAccessToken(tokens.accessToken, tokens.expiresIn);
        setRefreshToken(tokens.refreshToken);
        setStoredUsername(un.trim().toLowerCase());
    }

    function resetState() {
        setStep(1);
        setError('');
        setInfo('');
        setOtp('');
        setPassword('');
        setConfirmPass('');
        setTimeLeft(OTP_TTL_SECONDS);
    }

    function switchTo(nextMode: Mode) {
        resetState();
        setMode(nextMode);
    }

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInfo('');
        const trimmedUser = username.trim().toLowerCase();

        // ── Login ────────────────────────────────────────────────────────────
        if (mode === 'login') {
            if (!trimmedUser.endsWith(ALLOWED_DOMAIN)) {
                return setError(`Must use an ${ALLOWED_DOMAIN} email address.`);
            }
            setLoading(true);
            try {
                const tokens = await authLogin({ username: trimmedUser, password });
                handleAuthTokens(tokens, trimmedUser);
                navigate('/', { replace: true });
            } catch (err: any) {
                setError(err.message || 'Authentication failed.');
            } finally {
                setLoading(false);
            }

        // ── Register — step 1: send OTP ──────────────────────────────────────
        } else if (mode === 'register' && step === 1) {
            if (!trimmedUser.endsWith(ALLOWED_DOMAIN)) {
                return setError(`Must use an ${ALLOWED_DOMAIN} email address.`);
            }
            setLoading(true);
            try {
                await authRegister({ username: trimmedUser, password });
                setStep(2);
                setTimeLeft(OTP_TTL_SECONDS);
            } catch (err: any) {
                setError(err.message || 'Registration failed.');
            } finally {
                setLoading(false);
            }

        // ── Register — step 2: verify OTP ────────────────────────────────────
        } else if (mode === 'register' && step === 2) {
            setLoading(true);
            try {
                const tokens = await authVerifyOTP({ username: trimmedUser, otp });
                handleAuthTokens(tokens, trimmedUser);
                navigate('/', { replace: true });
            } catch (err: any) {
                setError(err.message || 'Verification failed.');
            } finally {
                setLoading(false);
            }

        // ── Forgot Password — step 1: enter email ────────────────────────────
        } else if (mode === 'forgotPassword') {
            if (!trimmedUser.endsWith(ALLOWED_DOMAIN)) {
                return setError(`Must use an ${ALLOWED_DOMAIN} email address.`);
            }
            setLoading(true);
            try {
                await authForgotPassword({ username: trimmedUser });
                // Always advance (backend returns generic message regardless of
                // whether the email exists — prevents enumeration)
                setMode('forgotOTP');
                setTimeLeft(OTP_TTL_SECONDS);
                setInfo(`If ${trimmedUser} is registered, a reset code has been sent.`);
            } catch (err: any) {
                setError(err.message || 'Could not send reset code. Please try again.');
            } finally {
                setLoading(false);
            }

        // ── Forgot Password — step 2: verify OTP ─────────────────────────────
        } else if (mode === 'forgotOTP') {
            if (otp.length !== 6) return setError('Please enter the 6-digit code.');
            setLoading(true);
            try {
                // We don't reset here — just advance to new-password screen.
                // Backend validates OTP again on resetPassword.
                setMode('resetPassword');
                setError('');
            } catch (err: any) {
                setError(err.message || 'Invalid code.');
            } finally {
                setLoading(false);
            }

        // ── Forgot Password — step 3: set new password ───────────────────────
        } else if (mode === 'resetPassword') {
            if (password.length < 8) {
                return setError('Password must be at least 8 characters.');
            }
            if (password !== confirmPass) {
                return setError('Passwords do not match.');
            }
            setLoading(true);
            try {
                await authResetPassword({
                    username:    trimmedUser,
                    otp,
                    newPassword: password
                });
                switchTo('login');
                setInfo('Password reset successfully. Please sign in with your new password.');
            } catch (err: any) {
                setError(err.message || 'Reset failed. The code may have expired.');
            } finally {
                setLoading(false);
            }
        }
    }, [username, password, confirmPass, otp, mode, step, navigate]);

    // ── Titles ────────────────────────────────────────────────────────────────
    const titles: Record<Mode, string> = {
        login:          'Welcome Back',
        register:       step === 1 ? 'Create Account' : 'Verify Your Email',
        forgotPassword: 'Reset Password',
        forgotOTP:      'Enter Reset Code',
        resetPassword:  'Set New Password',
    };

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
                        <CardTitle className="text-center text-lg">{titles[mode]}</CardTitle>
                    </CardHeader>

                    <form onSubmit={handleSubmit} noValidate>
                        <CardContent className="space-y-4">

                            {/* ── Email field — shown on all step-1 screens ── */}
                            {(mode === 'login' || mode === 'register' || mode === 'forgotPassword') && (
                                <Input
                                    type="email"
                                    placeholder={`Work email (${ALLOWED_DOMAIN})`}
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    autoComplete="email"
                                    required
                                    disabled={loading}
                                />
                            )}

                            {/* ── Password field — login & register step 1 ── */}
                            {(mode === 'login' || (mode === 'register' && step === 1)) && (
                                <Input
                                    type="password"
                                    placeholder={mode === 'register' ? 'Password (min 8 characters)' : 'Password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                    minLength={mode === 'register' ? 8 : 1}
                                    required
                                    disabled={loading}
                                />
                            )}

                            {/* ── Register OTP step ── */}
                            {mode === 'register' && step === 2 && (
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

                            {/* ── Forgot Password OTP step ── */}
                            {mode === 'forgotOTP' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-center text-muted-foreground">
                                        Enter the 6-digit reset code sent to <strong>{username.trim()}</strong>.
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

                            {/* ── New password step ── */}
                            {mode === 'resetPassword' && (
                                <div className="space-y-3">
                                    <Input
                                        type="password"
                                        placeholder="New password (min 8 characters)"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                        disabled={loading}
                                    />
                                    <Input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPass}
                                        onChange={e => setConfirmPass(e.target.value)}
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            )}

                            {/* ── Info banner ── */}
                            {info && !error && (
                                <div className="text-sm font-medium text-center text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2" role="status">
                                    {info}
                                </div>
                            )}

                            {/* ── Error banner ── */}
                            {error && (
                                <div className="text-sm font-medium text-destructive text-center bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2" role="alert">
                                    {error}
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-col gap-3">
                            {/* ── Primary action button ── */}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading
                                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Please wait…</>
                                    : mode === 'login'          ? 'Sign In'
                                    : mode === 'register'       ? (step === 1 ? 'Send Verification Code' : 'Verify & Sign In')
                                    : mode === 'forgotPassword' ? 'Send Reset Code'
                                    : mode === 'forgotOTP'      ? 'Continue'
                                    : 'Reset Password'}
                            </Button>

                            {/* ── Secondary navigation links ── */}
                            {mode === 'login' && (
                                <>
                                    <Button type="button" variant="link" className="text-muted-foreground text-sm" onClick={() => switchTo('register')}>
                                        Don't have an account? Create one
                                    </Button>
                                    <Button type="button" variant="link" className="text-muted-foreground text-sm" onClick={() => switchTo('forgotPassword')}>
                                        Forgot your password?
                                    </Button>
                                </>
                            )}

                            {mode === 'register' && step === 1 && (
                                <Button type="button" variant="link" className="text-muted-foreground text-sm" onClick={() => switchTo('login')}>
                                    Already have an account? Sign in
                                </Button>
                            )}

                            {(mode === 'register' && step === 2) && (
                                <Button type="button" variant="link" className="text-sm" onClick={() => { setStep(1); setError(''); }}>
                                    ← Back
                                </Button>
                            )}

                            {(mode === 'forgotPassword' || mode === 'forgotOTP' || mode === 'resetPassword') && (
                                <Button type="button" variant="link" className="text-sm text-muted-foreground" onClick={() => switchTo('login')}>
                                    ← Back to Sign In
                                </Button>
                            )}
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
