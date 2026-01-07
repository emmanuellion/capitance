'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
    const router = useRouter();
    const { token } = use(params);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        async function verifyEmail() {
            try {
                await authApi.verifyEmail(token);
                setStatus('success');
                setMessage('Email vérifié avec succès ! Vous pouvez maintenant vous connecter.');
            } catch (err) {
                setStatus('error');
                if (err instanceof ApiError) {
                    setMessage(err.message);
                } else {
                    setMessage('Une erreur inattendue s\'est produite');
                }
            }
        }

        verifyEmail();
    }, [token]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />}
                        {status === 'error' && <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
                        Vérification Email
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                        {status === 'loading' && 'Vérification de votre email en cours...'}
                        {status === 'success' && 'Vérification réussie'}
                        {status === 'error' && 'Échec de la vérification'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === 'loading' && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
                        </div>
                    )}

                    {status === 'success' && (
                        <>
                            <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
                                <AlertDescription className="text-green-800 dark:text-green-200">
                                    {message}
                                </AlertDescription>
                            </Alert>
                            <Button
                                onClick={() => router.push('/auth/login')}
                                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all cursor-pointer"
                            >
                                Aller à la connexion
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <Alert variant="destructive">
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                            <Button
                                onClick={() => router.push('/auth/register')}
                                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all cursor-pointer"
                                variant="default"
                            >
                                Retour à l'inscription
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
