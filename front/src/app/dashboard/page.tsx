'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { snapshotApi, fileApi, ApiError } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Wallet, PieChart, Upload, RefreshCw, Bitcoin } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardHomePage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [filesCount, setFilesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        setLoading(true);
        setError('');

        try {
            const [snapshots, files] = await Promise.all([
                snapshotApi.getSnapshots(),
                fileApi.getFiles(user!._id),
            ]);

            setFilesCount(files.length);

            if (snapshots && snapshots.length > 0) {
                // Get most recent snapshot
                const latest = snapshots.sort((a: any, b: any) =>
                    new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
                )[0];

                setStats(latest);
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Erreur lors du chargement des données');
            }
        } finally {
            setLoading(false);
        }
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

    const formatPercentage = (value: number) =>
        `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Tableau de bord
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Vue d'ensemble de votre portefeuille
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Actualiser
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!stats ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                Aucun portefeuille trouvé
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                Importez votre premier fichier CSV pour commencer
                            </p>
                            <Link href="/dashboard/files">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    Importer un fichier
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Value */}
                        <Card className="border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Valeur totale
                                </CardTitle>
                                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {formatCurrency(stats.totalValue)}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    Investissement total: {formatCurrency(stats.totalInvested)}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Gain/Loss */}
                        <Card className={`border-slate-200 dark:border-slate-700 ${stats.totalGainLoss >= 0
                            ? 'bg-green-50 dark:bg-green-950/30'
                            : 'bg-red-50 dark:bg-red-950/30'
                            }`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Gain/Perte
                                </CardTitle>
                                {stats.totalGainLoss >= 0 ? (
                                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${stats.totalGainLoss >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    {formatCurrency(stats.totalGainLoss)}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    {formatPercentage(stats.totalGainLossPercentage)}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Positions */}
                        <Card className="border-slate-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-950/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Positions actives
                                </CardTitle>
                                <PieChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {stats.positions.length}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    Actifs différents
                                </p>
                            </CardContent>
                        </Card>

                        {/* Files */}
                        <Card className="border-slate-200 dark:border-slate-700 bg-orange-50 dark:bg-orange-950/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Fichiers importés
                                </CardTitle>
                                <Upload className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                    {filesCount}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    Snapshots disponibles
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Links */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Link href="/dashboard/overview">
                            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer border-slate-200 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        Graphiques
                                    </CardTitle>
                                    <CardDescription>
                                        Visualisez vos performances avec des graphiques détaillés
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>

                        <Link href="/dashboard/positions">
                            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer border-slate-200 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        Positions
                                    </CardTitle>
                                    <CardDescription>
                                        Consultez le détail de toutes vos positions
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>

                        <Link href="/dashboard/files">
                            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer border-slate-200 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                            <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        Fichiers
                                    </CardTitle>
                                    <CardDescription>
                                        Gérez vos imports et snapshots
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>

                        <Link href="/dashboard/binance">
                            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer border-slate-200 dark:border-slate-700 bg-yellow-50 dark:bg-yellow-950/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                            <Bitcoin className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        Binance
                                    </CardTitle>
                                    <CardDescription>
                                        Connectez votre portfolio Binance
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
