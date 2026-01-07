'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, ApiError } from '@/lib/api';

interface User {
    _id: string;
    email: string;
    isVerified: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    register: (email: string, password: string, confirmPassword: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user on mount
    useEffect(() => {
        loadUser();
    }, []);

    async function loadUser() {
        try {
            const response = await authApi.getCurrentUser();
            setUser(response.user);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    async function login(email: string, password: string, rememberMe: boolean = false) {
        const response = await authApi.login({ email, password, rememberMe });
        setUser(response.user);
    }

    async function register(email: string, password: string, confirmPassword: string) {
        await authApi.register({ email, password, confirmPassword });
        // Don't set user - they need to verify email first
    }

    async function logout() {
        await authApi.logout();
        setUser(null);
    }

    async function refreshUser() {
        await loadUser();
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
