'use client';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <RegisterForm />
        </div>
    );
}
