'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
    TrendingUp,
    LayoutDashboard,
    BarChart3,
    Table2,
    FolderOpen,
    Clock,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const navigation = [
    { name: 'Vue d\'ensemble', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Graphiques', href: '/dashboard/overview', icon: BarChart3 },
    { name: 'Positions', href: '/dashboard/positions', icon: Table2 },
    { name: 'Fichiers', href: '/dashboard/files', icon: FolderOpen },
    { name: 'Timeline', href: '/dashboard/timeline', icon: Clock },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
    }, [user, loading, router]);

    async function handleLogout() {
        try {
            await logout();
            router.push('/auth/login');
        } catch (err) {
            console.error('Logout error:', err);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="h-screen flex bg-gray-50 dark:bg-gray-950">
            {/* Sidebar for desktop */}
            <div className="hidden md:flex md:w-64 md:flex-col">
                <div className="flex flex-col flex-grow border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto">
                    {/* Logo */}
                    <div className="flex items-center gap-2 h-16 px-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Capitance
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`
                                        group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all
                                        ${isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }
                                    `}
                                >
                                    <item.icon
                                        className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center mb-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {user.email}
                                </p>
                                {!user.isVerified && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400">
                                        Email non vérifié
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full border-gray-300 dark:border-gray-700 hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 dark:hover:border-red-500 transition-all cursor-pointer"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Déconnexion
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
                        {/* Logo */}
                        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Capitance
                                </span>
                            </div>
                            <button onClick={() => setSidebarOpen(false)}>
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`
                                            group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all
                                            ${isActive
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }
                                        `}
                                    >
                                        <item.icon
                                            className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User section */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex items-center mb-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {user.email}
                                    </p>
                                    {!user.isVerified && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400">
                                            Email non vérifié
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="w-full border-gray-300 dark:border-gray-700 hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 dark:hover:border-red-500 transition-all cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Déconnexion
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar for mobile */}
                <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Capitance
                        </span>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Content area */}
                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
                    {!user.isVerified && (
                        <div className="sticky top-0 z-10">
                            <Alert className="rounded-none border-x-0 border-t-0 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950">
                                <AlertDescription className="text-orange-800 dark:text-orange-200 text-center">
                                    Veuillez vérifier votre adresse email pour accéder à toutes les fonctionnalités.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
