import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authUser } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2 } from 'lucide-react';

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const action = isRegistering ? 'register' : 'login';
            const token = await authUser(action, { username, password });
            
            // SECURITY: Store the JWT Token securely
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
                        <CardTitle className="text-center">{isRegistering ? 'Create Account' : 'Welcome Back'}</CardTitle>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Please wait...' : (isRegistering ? 'Sign Up' : 'Login')}
                            </Button>
                            <Button type="button" variant="link" className="text-muted-foreground" onClick={() => setIsRegistering(!isRegistering)}>
                                {isRegistering ? 'Already have an account? Login' : "Don't have an account? Sign up"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}