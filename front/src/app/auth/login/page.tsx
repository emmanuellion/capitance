'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="absolute top-4 left-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour à l'accueil
                </Link>
            </div>
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <LoginForm />
        </div>
    );
}
