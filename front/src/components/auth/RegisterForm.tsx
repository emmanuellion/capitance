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

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[!@\-#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
    const router = useRouter();
    const { register: registerUser } = useAuth();
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    async function onSubmit(data: RegisterFormData) {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await registerUser(data.email, data.password, data.confirmPassword);
            setSuccess('Registration successful! Please check your email to verify your account.');
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
                <CardTitle className="text-gray-900 dark:text-white">Créer un compte</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    Inscrivez-vous pour créer votre compte Capitance
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
                            <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
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
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? 'Création du compte...' : 'S\'inscrire'}
                    </Button>
                </form>
            </CardContent>
            <CardFooter>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Vous avez déjà un compte?{' '}
                    <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer">
                        Se connecter
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
