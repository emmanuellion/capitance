import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <ForgotPasswordForm />
        </div>
    );
}
