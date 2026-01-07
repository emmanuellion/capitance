'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { snapshotApi, TimelineEntry } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimelineChart } from '@/components/analytics/TimelineChart';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export default function TimelinePage() {
  const { user } = useAuth();

  // Fetch timeline with TanStack Query
  const { data: timelineData, isLoading, error, refetch } = useQuery({
    queryKey: ['timeline', user?._id],
    queryFn: () => snapshotApi.getTimeline(),
    enabled: !!user,
  });

  // Sort timeline by date ascending for chart (memoized)
  const timeline = useMemo(() => {
    if (!timelineData) return [];

    return [...timelineData].sort((a: TimelineEntry, b: TimelineEntry) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [timelineData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));

  // Calculate stats
  const latestValue = timeline.length > 0 ? timeline[timeline.length - 1].totalValue : 0;
  const latestGainLoss = timeline.length > 0 ? timeline[timeline.length - 1].gainLoss : 0;
  const firstValue = timeline.length > 0 ? timeline[0].totalValue : 0;
  const totalGrowth = firstValue > 0 ? ((latestValue - firstValue) / firstValue) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Timeline
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Évolution historique de votre portefeuille
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Erreur lors du chargement de la timeline'}
          </AlertDescription>
        </Alert>
      )}

      {timeline.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-500 dark:text-gray-400">
              Aucune donnée historique disponible. Importez plusieurs fichiers pour voir l'évolution.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Valeur Actuelle
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(latestValue)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Dernière mise à jour
                </p>
              </CardContent>
            </Card>

            <Card className={`border-gray-200 dark:border-gray-800 ${
              latestGainLoss >= 0
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30'
                : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30'
            }`}>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Performance
                </p>
                <div className="flex items-center gap-2">
                  {latestGainLoss >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <p className={`text-2xl font-bold ${
                    latestGainLoss >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(latestGainLoss)}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Plus/Moins-value totale
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Snapshots
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {timeline.length}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Points de mesure
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Évolution du Portefeuille
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <TimelineChart
                  timeline={timeline.map((entry) => ({
                    date: entry.date,
                    portfolioValue: entry.totalValue,
                    cashFlow: 0,
                    operationType: '',
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline List */}
          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Historique Détaillé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.slice().reverse().map((entry, index) => {
                  const isLatest = index === 0;
                  const prevEntry = index < timeline.length - 1 ? timeline[timeline.length - 1 - index - 1] : null;
                  const valueChange = prevEntry ? entry.totalValue - prevEntry.totalValue : 0;
                  const isPositiveChange = valueChange >= 0;

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        isLatest
                          ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${
                          isLatest
                            ? 'bg-blue-100 dark:bg-blue-900/50'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <Calendar className={`h-5 w-5 ${
                            isLatest
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatDate(entry.date)}
                            {isLatest && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                (Plus récent)
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {entry.snapshotCount} snapshot{entry.snapshotCount > 1 ? 's' : ''} ce jour
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(entry.totalValue)}
                        </p>
                        {prevEntry && (
                          <p className={`text-sm ${
                            isPositiveChange
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isPositiveChange ? '+' : ''}
                            {formatCurrency(valueChange)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
