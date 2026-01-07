'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
    const router = useRouter();
    const { login } = useAuth();
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            rememberMe: false,
        },
    });

    const rememberMe = watch('rememberMe');

    async function onSubmit(data: LoginFormData) {
        setError('');
        setLoading(true);

        try {
            await login(data.email, data.password, data.rememberMe);
            router.push('/dashboard');
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-md border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Connexion</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    Entrez vos identifiants pour accéder à votre compte
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
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

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-900 dark:text-white">Mot de passe</Label>
                        <PasswordInput
                            id="password"
                            placeholder="••••••••"
                            {...register('password')}
                            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                        />
                        {errors.password && (
                            <p className="text-sm text-red-500 dark:text-red-400">{errors.password.message}</p>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setValue('rememberMe', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 cursor-pointer accent-blue-600 hover:accent-blue-700 transition-colors"
                        />
                        <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                            Se souvenir de moi pendant 30 jours
                        </Label>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
                <Link href="/auth/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer">
                    Mot de passe oublié ?
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pas encore de compte?{' '}
                    <Link href="/auth/register" className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer">
                        S'inscrire
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
