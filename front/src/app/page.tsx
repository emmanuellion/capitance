'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BarChart3, PieChart, LineChart, Shield, Zap, ArrowRight, FileText, Upload, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 transition-colors">
            {/* Navigation */}
            <nav className="border-b border-white/20 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Capitance
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <Link href="/auth/login">
                                <Button variant="ghost" className="dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-all cursor-pointer">
                                    Se connecter
                                </Button>
                            </Link>
                            <Link href="/auth/register">
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all cursor-pointer shadow-lg hover:shadow-xl">
                                    Commencer
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-6">
                            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Analyse de Portefeuille en Temps Réel</span>
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                            Suivez votre portefeuille
                            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
                                comme un pro
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
                            Importez vos relevés Boursobank et obtenez une analyse détaillée de vos investissements.
                            Performance, répartition, historique - tout en un seul endroit.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/auth/register">
                                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-105 transition-all cursor-pointer shadow-2xl hover:shadow-blue-500/50">
                                    Analyser mon portefeuille
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="/auth/login">
                                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 hover:scale-105 transition-all cursor-pointer">
                                    Déjà inscrit
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Hero Image Placeholder */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur-3xl opacity-20"></div>
                        <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
                            <div className="grid grid-cols-3 gap-4">
                                <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                                    <CardHeader>
                                        <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">+24.5%</CardTitle>
                                        <CardDescription>Performance totale</CardDescription>
                                    </CardHeader>
                                </Card>
                                <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                                    <CardHeader>
                                        <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">12 540 €</CardTitle>
                                        <CardDescription>Valeur du portefeuille</CardDescription>
                                    </CardHeader>
                                </Card>
                                <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
                                    <CardHeader>
                                        <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">9</CardTitle>
                                        <CardDescription>Positions actives</CardDescription>
                                    </CardHeader>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Toutes les fonctionnalités dont vous avez besoin
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Une plateforme complète pour analyser et suivre vos investissements
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default group">
                            <CardHeader>
                                <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <BarChart3 className="h-7 w-7 text-white" />
                                </div>
                                <CardTitle className="text-xl text-gray-900 dark:text-white">Vue d'ensemble complète</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Visualisez la performance globale de votre portefeuille en un coup d'œil
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default group">
                            <CardHeader>
                                <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <PieChart className="h-7 w-7 text-white" />
                                </div>
                                <CardTitle className="text-xl text-gray-900 dark:text-white">Répartition détaillée</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Analysez la répartition de vos actifs avec des graphiques interactifs
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default group">
                            <CardHeader>
                                <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <LineChart className="h-7 w-7 text-white" />
                                </div>
                                <CardTitle className="text-xl text-gray-900 dark:text-white">Timeline historique</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Suivez l'évolution de votre portefeuille au fil du temps
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default group">
                            <CardHeader>
                                <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <Upload className="h-7 w-7 text-white" />
                                </div>
                                <CardTitle className="text-xl text-gray-900 dark:text-white">Import automatique</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Importez vos fichiers Boursobank et obtenez une analyse instantanée
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default group">
                            <CardHeader>
                                <div className="h-14 w-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <Shield className="h-7 w-7 text-white" />
                                </div>
                                <CardTitle className="text-xl text-gray-900 dark:text-white">Données sécurisées</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Vos données sont chiffrées et protégées avec les meilleurs standards
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default group">
                            <CardHeader>
                                <div className="h-14 w-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                    <Zap className="h-7 w-7 text-white" />
                                </div>
                                <CardTitle className="text-xl text-gray-900 dark:text-white">Temps réel</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Mise à jour instantanée dès l'import de vos nouveaux relevés
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Comment ça marche ?
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            Trois étapes simples pour commencer à suivre votre portefeuille
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center group">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl text-3xl font-bold mb-6 shadow-2xl group-hover:scale-110 transition-transform">
                                1
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Créez votre compte</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Inscrivez-vous gratuitement en quelques secondes avec votre email
                            </p>
                        </div>
                        <div className="text-center group">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl text-3xl font-bold mb-6 shadow-2xl group-hover:scale-110 transition-transform">
                                2
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Importez vos relevés</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Téléchargez vos fichiers CSV depuis Boursobank et laissez faire la magie
                            </p>
                        </div>
                        <div className="text-center group">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl text-3xl font-bold mb-6 shadow-2xl group-hover:scale-110 transition-transform">
                                3
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Analysez et suivez</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Visualisez votre performance et prenez de meilleures décisions d'investissement
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/10"></div>
                <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                        Prêt à optimiser vos investissements ?
                    </h2>
                    <p className="text-xl text-blue-100 mb-10 leading-relaxed">
                        Rejoignez Capitance aujourd'hui et prenez le contrôle de votre portefeuille
                    </p>
                    <Link href="/auth/register">
                        <Button size="lg" variant="secondary" className="text-lg px-10 py-6 bg-white text-blue-600 hover:bg-gray-100 hover:scale-105 transition-all cursor-pointer shadow-2xl hover:shadow-white/20">
                            Commencer gratuitement
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 dark:bg-black text-gray-400 dark:text-gray-500 py-12 border-t border-gray-800 dark:border-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center gap-2 mb-4 md:mb-0">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Capitance</span>
                        </div>
                        <div className="text-center md:text-right">
                            <p>&copy; 2026 Capitance. Tous droits réservés.</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
