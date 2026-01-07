'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { snapshotApi, FileInfo, PortfolioSnapshot, NormalizedPosition, TimelineEntry } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AnalyticsControls } from './AnalyticsControls';
import { PerformanceCard } from './PerformanceCard';
import { AllocationChart } from './AllocationChart';
import { TimelineChart } from './TimelineChart';
import { PositionsTable } from './PositionsTable';

interface AnalyticsDashboardProps {
  files: FileInfo[];
}

// Adapter les types pour la compatibilité avec les anciens composants
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

export function AnalyticsDashboard({ files }: AnalyticsDashboardProps) {
  const queryClient = useQueryClient();
  const [selectedFileId, setSelectedFileId] = useState<string | 'all'>('all');

  // Fetch snapshots
  const {
    data: snapshots,
    isLoading: snapshotsLoading,
    error: snapshotsError,
  } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => snapshotApi.getSnapshots(),
    enabled: files.length > 0,
  });

  // Fetch timeline (only when selectedFileId is 'all')
  const {
    data: timeline,
    isLoading: timelineLoading,
    error: timelineError,
  } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => snapshotApi.getTimeline(),
    enabled: files.length > 0 && selectedFileId === 'all',
  });

  // Combine loading and error states
  const isLoading = snapshotsLoading || (selectedFileId === 'all' && timelineLoading);
  const error = snapshotsError || timelineError;

  // Compute metrics based on selectedFileId (memoized)
  const metrics = useMemo((): AnalysisMetrics | null => {
    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    if (selectedFileId === 'all') {
      if (!timeline) return null;

      // Aggregate all snapshots
      const aggregated = aggregateSnapshots(snapshots);

      return {
        ...aggregated,
        timeline: timeline.map((entry: TimelineEntry) => ({
          date: entry.date,
          portfolioValue: entry.totalValue,
          cashFlow: 0,
          operationType: '',
        })),
      };
    } else {
      // Find specific snapshot for selected file
      const snapshot = snapshots.find((s: PortfolioSnapshot) => s.uploadId === selectedFileId);

      if (!snapshot) {
        return null;
      }

      return convertSnapshotToMetrics(snapshot);
    }
  }, [snapshots, timeline, selectedFileId]);

  // Convertir un snapshot en métriques pour compatibilité avec les anciens composants
  function convertSnapshotToMetrics(snapshot: PortfolioSnapshot): AnalysisMetrics {
    const positions = snapshot.positions.map((pos: NormalizedPosition) => ({
      isin: pos.isin,
      assetName: pos.assetName,
      quantity: pos.quantity,
      pru: pos.averageBuyingPrice,
      totalInvested: pos.totalInvested,
      currentValue: pos.currentValue,
      gainLoss: pos.gainLoss,
      gainLossPercentage: pos.gainLossPercentage,
      allocationPercentage: snapshot.totalValue > 0
        ? (pos.currentValue / snapshot.totalValue) * 100
        : 0,
    }));

    return {
      totalInvested: snapshot.totalInvested,
      totalValue: snapshot.totalValue,
      totalGainLoss: snapshot.totalGainLoss,
      returnPercentage: snapshot.totalGainLossPercentage,
      positions,
      timeline: [{
        date: snapshot.snapshotDate,
        portfolioValue: snapshot.totalValue,
        cashFlow: 0,
        operationType: '',
      }],
    };
  }

  // Agréger plusieurs snapshots
  function aggregateSnapshots(snapshots: PortfolioSnapshot[]): Omit<AnalysisMetrics, 'timeline'> {
    // Utiliser le snapshot le plus récent pour les totaux
    const latest = snapshots.sort((a: PortfolioSnapshot, b: PortfolioSnapshot) =>
      new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    )[0];

    if (!latest) {
      return {
        totalInvested: 0,
        totalValue: 0,
        totalGainLoss: 0,
        returnPercentage: 0,
        positions: [],
      };
    }

    // Merger les positions de tous les snapshots par ISIN
    const positionsMap = new Map<string, NormalizedPosition>();

    snapshots.forEach((snapshot: PortfolioSnapshot) => {
      snapshot.positions.forEach((pos: NormalizedPosition) => {
        const existing = positionsMap.get(pos.isin);
        if (!existing || new Date(snapshot.snapshotDate) > new Date((existing as any).lastUpdate || 0)) {
          positionsMap.set(pos.isin, { ...pos, lastUpdate: snapshot.snapshotDate } as any);
        }
      });
    });

    const positions = Array.from(positionsMap.values()).map((pos: NormalizedPosition) => ({
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
    };
  }

  // Reanalyze mutation
  const reanalyzeMutation = useMutation({
    mutationFn: () => snapshotApi.reprocessAll(),
    onSuccess: () => {
      // Invalidate all queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  function handleReanalyze() {
    reanalyzeMutation.mutate();
  }

  if (files.length === 0) {
    return (
      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <CardContent className="py-12">
          <p className="text-center text-gray-500 dark:text-gray-400">
            Uploadez un fichier CSV pour voir les analyses
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsControls
        files={files}
        selectedFileId={selectedFileId}
        onFileSelect={setSelectedFileId}
        onReanalyze={handleReanalyze}
        loading={isLoading || reanalyzeMutation.isPending}
      />

      {(error || reanalyzeMutation.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : reanalyzeMutation.error instanceof Error
              ? reanalyzeMutation.error.message
              : "Erreur lors du chargement de l'analyse"}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && !metrics && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
        </div>
      )}

      {metrics && (
        <>
          <PerformanceCard metrics={metrics} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Répartition par Actif
                </h3>
                {metrics.positions.length > 0 ? (
                  <AllocationChart positions={metrics.positions} />
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                    Aucune position trouvée
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <CardContent className="pt-6">
                {metrics.timeline.length > 0 ? (
                  <TimelineChart timeline={metrics.timeline} />
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                    Aucune donnée temporelle
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {metrics.positions.length > 0 && <PositionsTable positions={metrics.positions} />}
        </>
      )}
    </div>
  );
}
