import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authLogout } from '@/lib/api';

/**
 * Auto-logout after `timeoutMinutes` of inactivity.
 * Tracks mouse, keyboard, touch and scroll events.
 * Calls the backend logout endpoint to revoke the refresh token.
 */
export function useAutoLogout(timeoutMinutes = 20) {
    const navigate  = useNavigate();
    const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const logout = useCallback(async () => {
        try { await authLogout(); } catch { /* best-effort */ }
        navigate('/login', { replace: true });
    }, [navigate]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, timeoutMs);
    }, [logout, timeoutMs]);

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
        events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();
        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resetTimer]);
}
