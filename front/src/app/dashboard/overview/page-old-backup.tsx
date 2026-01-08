'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { snapshotApi } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { FadeIn } from '@/components/motion/FadeIn';

// Dynamic imports for charts - loaded on-demand
const PerformanceCard = dynamic(() => import('@/components/analytics/PerformanceCard').then(mod => ({ default: mod.PerformanceCard })), {
  loading: () => (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <CardContent className="pt-6">
        <div className="h-[200px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600"></div>
        </div>
      </CardContent>
    </Card>
  ),
  ssr: false,
});

const AllocationChart = dynamic(() => import('@/components/analytics/AllocationChart').then(mod => ({ default: mod.AllocationChart })), {
  loading: () => (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <CardContent className="pt-6">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600"></div>
        </div>
      </CardContent>
    </Card>
  ),
  ssr: false,
});

const TimelineChart = dynamic(() => import('@/components/analytics/TimelineChart').then(mod => ({ default: mod.TimelineChart })), {
  loading: () => (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <CardContent className="pt-6">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600"></div>
        </div>
      </CardContent>
    </Card>
  ),
  ssr: false,
});

// Adapter types for compatibility with existing components
interface AnalysisMetrics {
  totalInvested: number;
  totalValue: number;
  totalGainLoss: number;
  returnPercentage: number;
  positions: Array<{
    isin: string;
    assetName: string;
    quantity: number;
    pru: number;
    totalInvested: number;
    currentValue: number;
    gainLoss: number;
    gainLossPercentage: number;
    allocationPercentage: number;
  }>;
  timeline: Array<{
    date: Date;
    portfolioValue: number;
    cashFlow: number;
    operationType: string;
  }>;
}

export default function OverviewPage() {
  const { user } = useAuth();

  // Fetch snapshots with TanStack Query
  const {
    data: snapshots,
    isLoading: snapshotsLoading,
    error: snapshotsError,
    refetch: refetchSnapshots
  } = useQuery({
    queryKey: ['snapshots', user?._id],
    queryFn: () => snapshotApi.getSnapshots(),
    enabled: !!user,
  });

  // Fetch timeline with TanStack Query
  const {
    data: timeline,
    isLoading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline
  } = useQuery({
    queryKey: ['timeline', user?._id],
    queryFn: () => snapshotApi.getTimeline(),
    enabled: !!user,
  });

  // Combine loading and error states
  const isLoading = snapshotsLoading || timelineLoading;
  const error = snapshotsError || timelineError;

  // Refetch all data
  const refetch = () => {
    refetchSnapshots();
    refetchTimeline();
  };

  // Process snapshots and timeline into metrics (memoized)
  const metrics = useMemo((): AnalysisMetrics | null => {
    if (!snapshots || snapshots.length === 0 || !timeline) {
      return null;
    }

    // Get most recent snapshot
    const latest = [...snapshots].sort((a: any, b: any) =>
      new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    )[0];

    // Merge positions from all snapshots by ISIN
    const positionsMap = new Map<string, any>();
    snapshots.forEach((snapshot: any) => {
      snapshot.positions.forEach((pos: any) => {
        const existing = positionsMap.get(pos.isin);
        if (!existing || new Date(snapshot.snapshotDate) > new Date(existing.lastUpdate || 0)) {
          positionsMap.set(pos.isin, { ...pos, lastUpdate: snapshot.snapshotDate });
        }
      });
    });

    const positions = Array.from(positionsMap.values()).map((pos: any) => ({
      isin: pos.isin,
      assetName: pos.assetName,
      quantity: pos.quantity,
      pru: pos.averageBuyingPrice,
      totalInvested: pos.totalInvested,
      currentValue: pos.currentValue,
      gainLoss: pos.gainLoss,
      gainLossPercentage: pos.gainLossPercentage,
      allocationPercentage: latest.totalValue > 0
        ? (pos.currentValue / latest.totalValue) * 100
        : 0,
    }));

    return {
      totalInvested: latest.totalInvested,
      totalValue: latest.totalValue,
      totalGainLoss: latest.totalGainLoss,
      returnPercentage: latest.totalGainLossPercentage,
      positions,
      timeline: timeline.map((entry: any) => ({
        date: entry.date,
        portfolioValue: entry.totalValue,
        cashFlow: 0,
        operationType: '',
      })),
    };
  }, [snapshots, timeline]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Graphiques et Métriques
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Visualisez vos performances avec des graphiques détaillés
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
            {error instanceof Error ? error.message : 'Erreur lors du chargement des données'}
          </AlertDescription>
        </Alert>
      )}

      {!metrics ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-slate-500 dark:text-slate-400">
              Aucune donnée disponible. Importez votre premier fichier pour voir les graphiques.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Performance Card */}
          <PerformanceCard metrics={metrics} />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Répartition par Actif
                </h3>
                {metrics.positions.length > 0 ? (
                  <AllocationChart positions={metrics.positions} />
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-12">
                    Aucune position trouvée
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <CardContent className="pt-6">
                {metrics.timeline.length > 0 ? (
                  <TimelineChart timeline={metrics.timeline} />
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-12">
                    Aucune donnée temporelle
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
      </div>
    </PageTransition>
  );
}
