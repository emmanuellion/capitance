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
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-900">
            {/* Sidebar for desktop */}
            <div className="hidden md:flex md:w-64 md:flex-col">
                <div className="flex flex-col flex-grow border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
                    {/* Logo */}
                    <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="bg-blue-600 p-2 rounded-md">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
                                        flex items-center px-3 py-2 text-sm font-medium rounded-md
                                        ${isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="mb-3">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.email}</p>
                            {!user.isVerified && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                    Email non vérifié
                                </p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                    <div className="fixed inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                        {/* Logo */}
                        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600 p-2 rounded-md">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Capitance
                                </span>
                            </div>
                            <button onClick={() => setSidebarOpen(false)}>
                                <X className="h-6 w-6 text-slate-500" />
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
                                            flex items-center px-3 py-2 text-sm font-medium rounded-md
                                            ${isActive
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }
                                        `}
                                    >
                                        <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User section */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="mb-3">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.email}</p>
                                {!user.isVerified && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                        Email non vérifié
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-md">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            Capitance
                        </span>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Content area */}
                <main className="flex-1 overflow-y-auto">
                    {!user.isVerified && (
                        <Alert className="m-4 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                            <AlertDescription className="text-orange-800 dark:text-orange-200">
                                Veuillez vérifier votre email pour activer toutes les fonctionnalités.
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="p-4 md:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
