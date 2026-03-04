import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import { Toaster } from "@/components/ui/toaster";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    // Check for the JWT token
    const isAuthenticated = !!localStorage.getItem('token');
    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                    <ProtectedRoute>
                        <Index />
                    </ProtectedRoute>
                } />
            </Routes>
            <Toaster />
        </BrowserRouter>
    );
}