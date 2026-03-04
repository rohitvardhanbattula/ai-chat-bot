import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAutoLogout = (timeoutMinutes: number = 20) => {
    const navigate = useNavigate();

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                localStorage.removeItem('token'); // Clear token
                localStorage.removeItem('username');
                navigate('/login');
            }, timeoutMinutes * 60 * 1000); 
        };

        const events = ['mousemove', 'keydown', 'scroll', 'click'];
        events.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [navigate, timeoutMinutes]);
};