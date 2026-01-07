'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const resetPasswordSchema = z.object({
    newPassword: z
        .string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
        .regex(/[!@\-#$%^&*(),.?":{}|<>]/, 'Le mot de passe doit contenir au moins un caractère spécial'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
    token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
    const router = useRouter();
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    async function onSubmit(data: ResetPasswordFormData) {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await authApi.resetPassword({
                token,
                newPassword: data.newPassword,
                confirmPassword: data.confirmPassword,
            });
            setSuccess('Mot de passe réinitialisé avec succès ! Redirection...');
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
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
                <CardTitle className="text-gray-900 dark:text-white">Réinitialiser le mot de passe</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    Entrez votre nouveau mot de passe
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
                        <Label htmlFor="newPassword" className="text-gray-900 dark:text-white">Nouveau mot de passe</Label>
                        <PasswordInput
                            id="newPassword"
                            placeholder="••••••••"
                            {...register('newPassword')}
                            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                        />
                        {errors.newPassword && (
                            <p className="text-sm text-red-500 dark:text-red-400">{errors.newPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-gray-900 dark:text-white">Confirmer le mot de passe</Label>
                        <PasswordInput
                            id="confirmPassword"
                            placeholder="••••••••"
                            {...register('confirmPassword')}
                            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                        />
                        {errors.confirmPassword && (
                            <p className="text-sm text-red-500 dark:text-red-400">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all cursor-pointer"
                        disabled={loading || !!success}
                    >
                        {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
