import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Header = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'U';

    const handleLogout = () => {
        localStorage.removeItem('token'); // Clear token
        localStorage.removeItem('username');
        navigate('/login');
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