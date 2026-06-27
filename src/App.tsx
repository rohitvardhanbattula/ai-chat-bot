import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index    from './pages/Index';
import Login    from './pages/Login';
import { Toaster } from '@/components/ui/toaster';
import { isLoggedIn } from '@/lib/api';

/** Guards a route — redirects to /login if not authenticated */
function ProtectedRoute({ children }: { children: React.ReactElement }) {
    // isLoggedIn checks in-memory access token OR localStorage refresh token
    return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Index />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
        </BrowserRouter>
    );
}
