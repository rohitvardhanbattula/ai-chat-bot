import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authLogout, getStoredUsername } from '@/lib/api';

const Header = () => {
    const navigate = useNavigate();
    const username = getStoredUsername() || 'U';

    const handleLogout = async () => {
        // NOTE: previously this only did localStorage.removeItem('token'/'username'),
        // which didn't match the actual storage keys ('refreshToken'/'username')
        // and never called the backend to revoke the refresh token or cleared the
        // in-memory access token. That left the refresh token valid indefinitely
        // and isLoggedIn() still true, so navigating back to "/" after clicking
        // this Logout button silently signed the user back in. Route through the
        // same authLogout() used by the sidebar's Sign Out button instead.
        try { await authLogout(); } catch { /* best-effort */ }
        navigate('/login', { replace: true });
    };

    return (
        <header className="flex justify-between items-center px-6 py-3 border-b border-border bg-card shrink-0 h-14">
            <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-bold tracking-wide">Enterprise AI Hub</h1>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger className="outline-none cursor-pointer">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer font-medium text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}>
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
};

export default Header;