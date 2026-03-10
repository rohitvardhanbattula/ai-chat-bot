import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authUser } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2 } from 'lucide-react';

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600);
    const navigate = useNavigate();

    useEffect(() => {
        if (step === 2 && timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        } else if (timeLeft === 0) {
            setError("OTP Expired. Please try registering again.");
            setStep(1);
        }
    }, [step, timeLeft]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!username.toLowerCase().endsWith('@answerthink.com')) {
            return setError('Must use an @answerthink.com email address.');
        }

        setLoading(true);
        try {
            if (isRegistering && step === 1) {
                await authUser('register', { username, password });
                setStep(2);
                setTimeLeft(600);
            } else if (isRegistering && step === 2) {
                const token = await authUser('verifyOTP', { username, otp });
                localStorage.setItem('token', token);
                localStorage.setItem('username', username);
                navigate('/');
            } else {
                const token = await authUser('login', { username, password });
                localStorage.setItem('token', token);
                localStorage.setItem('username', username);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/30">
            <div className="w-full max-w-md p-4">
                <div className="flex flex-col items-center mb-8 gap-2">
                    <Building2 className="w-10 h-10 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Enterprise AI Hub</h1>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">
                            {isRegistering ? (step === 1 ? 'Create Account' : 'Verify Email') : 'Welcome Back'}
                        </CardTitle>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {step === 1 && (
                                <>
                                    <Input 
                                        type="email" 
                                        placeholder="Email (@answerthink.com)" 
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)} 
                                        required 
                                        disabled={loading}
                                    />
                                    <Input 
                                        type="password" 
                                        placeholder="Password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                        disabled={loading}
                                    />
                                </>
                            )}
                            
                            {step === 2 && isRegistering && (
                                <div className="space-y-2">
                                    <p className="text-sm text-center text-muted-foreground">
                                        Enter the 6-digit code sent to your email.
                                    </p>
                                    <Input 
                                        type="text" 
                                        maxLength={6}
                                        placeholder="Enter OTP" 
                                        value={otp} 
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                                        required 
                                    />
                                    <p className="text-xs text-center font-mono">
                                        Expires in: {formatTime(timeLeft)}
                                    </p>
                                </div>
                            )}

                            {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Please wait...' : (isRegistering ? (step === 1 ? 'Send OTP' : 'Verify & Login') : 'Login')}
                            </Button>
                            
                            {step === 1 && (
                                <Button type="button" variant="link" className="text-muted-foreground" onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setError('');
                                }}>
                                    {isRegistering ? 'Already have an account? Login' : "Don't have an account? Sign up"}
                                </Button>
                            )}
                            {step === 2 && (
                                <Button type="button" variant="link" onClick={() => setStep(1)}>
                                    Back to Registration
                                </Button>
                            )}
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}