'use client';

import { Activity, Database, RefreshCw, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { useWorkerStats, useCacheStats, useRefreshPrices } from '@/hooks/useRealtimePrices';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ApiMonitoringDashboard() {
  const { data: workerStats, isLoading: workerLoading } = useWorkerStats();
  const { data: cacheStats, isLoading: cacheLoading } = useCacheStats();
  const refreshMutation = useRefreshPrices();

  const handleForceRefresh = async () => {
    await refreshMutation.mutateAsync();
  };

  if (workerLoading || cacheLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const apiUsagePercent = cacheStats?.apiUsage?.current_usage
    ? (cacheStats.apiUsage.current_usage / cacheStats.apiUsage.plan_limit) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitoring API Temps Réel</h2>
          <p className="text-muted-foreground">État du système de mise à jour des prix</p>
        </div>
        <Button
          onClick={handleForceRefresh}
          disabled={refreshMutation.isPending}
          className="cursor-pointer hover:scale-105 transition-transform"
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshMutation.isPending && 'animate-spin')} />
          Forcer la mise à jour
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Worker Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worker Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Badge variant={workerStats?.isRunning ? 'default' : 'secondary'} className="mb-2">
                  {workerStats?.isRunning ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2" />
                      En cours
                    </>
                  ) : (
                    'En attente'
                  )}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Symboles surveillés</span>
                  <span className="font-medium">{workerStats?.uniqueSymbols || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prix mis à jour</span>
                  <span className="font-medium">{workerStats?.pricesUpdated || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Erreurs</span>
                  <span className={cn('font-medium', (workerStats?.errors || 0) > 0 && 'text-red-600')}>
                    {workerStats?.errors || 0}
                  </span>
                </div>
              </div>

              {workerStats?.lastRun && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Dernière mise à jour:{' '}
                    {new Date(workerStats.lastRun).toLocaleTimeString('fr-FR')}
                  </div>
                  {workerStats.nextRun && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <TrendingUp className="h-3 w-3" />
                      Prochaine: {new Date(workerStats.nextRun).toLocaleTimeString('fr-FR')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cache Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Redis</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prix en cache</span>
                  <span className="font-medium">{cacheStats?.totalPrices || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mappings ISIN</span>
                  <span className="font-medium">{cacheStats?.totalMappings || 0}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">
                  Taux de cache estimé
                </div>
                <Progress
                  value={
                    cacheStats?.totalPrices && workerStats?.uniqueSymbols
                      ? Math.min((cacheStats.totalPrices / workerStats.uniqueSymbols) * 100, 100)
                      : 0
                  }
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {cacheStats?.totalPrices && workerStats?.uniqueSymbols
                    ? Math.min((cacheStats.totalPrices / workerStats.uniqueSymbols) * 100, 100).toFixed(0)
                    : 0}% des symboles en cache
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage API Twelve Data</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cacheStats?.apiUsage ? (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Utilisé</span>
                      <span className="font-medium">
                        {cacheStats.apiUsage.current_usage || 0} / {cacheStats.apiUsage.plan_limit || 800}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Restant</span>
                      <span className="font-medium">
                        {(cacheStats.apiUsage.plan_limit || 800) - (cacheStats.apiUsage.current_usage || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Quota journalier</div>
                    <Progress value={apiUsagePercent} className="h-2" />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {apiUsagePercent.toFixed(1)}% utilisé
                      </span>
                      {apiUsagePercent > 80 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Quota élevé
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Informations d'usage non disponibles
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {apiUsagePercent > 90 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Attention: Quota API presque épuisé
            </CardTitle>
            <CardDescription>
              Vous avez utilisé {apiUsagePercent.toFixed(1)}% de votre quota journalier. Le worker
              continuera de fonctionner mais les nouvelles requêtes pourraient être limitées.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {(workerStats?.errors || 0) > 5 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Erreurs détectées
            </CardTitle>
            <CardDescription>
              Le worker a rencontré {workerStats?.errors} erreurs. Vérifiez la connexion à l'API Twelve
              Data et les logs du serveur.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
