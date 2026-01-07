'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { authApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const forgotPasswordSchema = z.object({
    email: z.string().email('Adresse email invalide'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    // Auto-clear success message after 5 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    async function onSubmit(data: ForgotPasswordFormData) {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await authApi.forgotPassword(data.email);
            setSuccess('Si cet email existe, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception.');
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Une erreur inattendue s\'est produite');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-md border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Mot de passe oublié</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    Entrez votre email pour recevoir un lien de réinitialisation
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                {success}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-900 dark:text-white">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            {...register('email')}
                            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500 dark:text-red-400">{errors.email.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all cursor-pointer"
                        disabled={loading}
                    >
                        {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                    </Button>
                </form>
            </CardContent>
            <CardFooter>
                <Link href="/auth/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer">
                    Retour à la connexion
                </Link>
            </CardFooter>
        </Card>
    );
}
