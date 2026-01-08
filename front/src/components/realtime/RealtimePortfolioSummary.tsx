'use client';

import { TrendingUp, TrendingDown, RefreshCw, Clock } from 'lucide-react';
import { usePerformanceSummary, useRefreshPrices } from '@/hooks/useRealtimePrices';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RealtimePortfolioSummaryProps {
  snapshotId: string;
  className?: string;
}

export function RealtimePortfolioSummary({ snapshotId, className }: RealtimePortfolioSummaryProps) {
  const { data: summary, isLoading, error, refetch } = usePerformanceSummary(snapshotId);
  const refreshMutation = useRefreshPrices();

  const handleRefresh = async () => {
    await refreshMutation.mutateAsync();
    refetch();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
          <CardDescription>Impossible de charger les données en temps réel</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isPositive = summary.realtime.totalGainLoss >= 0;
  const hasRealtimeChange = summary.change.valueChange !== 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Performance en Temps Réel</CardTitle>
          <CardDescription className="flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            Mis à jour: {new Date(summary.metadata.enrichedAt).toLocaleTimeString('fr-FR')}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
          className="cursor-pointer hover:scale-105 transition-transform"
        >
          <RefreshCw className={cn('h-4 w-4', refreshMutation.isPending && 'animate-spin')} />
          <span className="ml-2">{refreshMutation.isPending ? 'Actualisation...' : 'Actualiser'}</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Realtime Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Valeur Totale</p>
            <div>
              <p className="text-2xl font-bold">
                {summary.realtime.totalValue.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </p>
              {hasRealtimeChange && (
                <p
                  className={cn(
                    'text-sm flex items-center gap-1',
                    summary.change.valueChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {summary.change.valueChange > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {summary.change.valueChange > 0 ? '+' : ''}
                  {summary.change.valueChange.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  € ({summary.change.valueChangePercentage > 0 ? '+' : ''}
                  {summary.change.valueChangePercentage.toFixed(2)}%)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Gain/Perte</p>
            <div>
              <p
                className={cn(
                  'text-2xl font-bold',
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {isPositive ? '+' : ''}
                {summary.realtime.totalGainLoss.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </p>
              <p className={cn('text-sm', isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                {isPositive ? '+' : ''}
                {summary.realtime.totalGainLossPercentage.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Montant Investi</p>
            <p className="text-2xl font-bold">
              {summary.snapshot.totalValue.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </p>
          </div>
        </div>

        {/* Data Coverage */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              {summary.metadata.pricesAvailable}/{summary.metadata.totalPositions} positions mises à jour
            </span>
          </div>
          {summary.metadata.pricesAvailable < summary.metadata.totalPositions && (
            <span className="text-xs text-yellow-600 dark:text-yellow-500">
              Certains prix ne sont pas disponibles
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
