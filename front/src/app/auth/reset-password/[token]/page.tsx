import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default async function ResetPasswordPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <ResetPasswordForm token={token} />
        </div>
    );
}
