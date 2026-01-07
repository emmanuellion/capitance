'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { snapshotApi } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { PositionsTable } from '@/components/analytics/PositionsTable';
import { VirtualizedPositionsTable } from '@/components/analytics/VirtualizedPositionsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { usePositionsFilter } from '@/hooks/usePositionsFilter';
import { PageTransition } from '@/components/motion/PageTransition';
import { FadeIn } from '@/components/motion/FadeIn';

interface Position {
  isin: string;
  assetName: string;
  quantity: number;
  pru: number;
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  allocationPercentage: number;
}

export default function PositionsPage() {
  const { user } = useAuth();

  // Fetch snapshots with TanStack Query
  const { data: snapshots, isLoading, error, refetch } = useQuery({
    queryKey: ['snapshots', user?._id],
    queryFn: () => snapshotApi.getSnapshots(),
    enabled: !!user, // Only fetch if user is authenticated
  });

  // Process snapshots into positions (memoized)
  const { positions, totalValue, totalGainLoss } = useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      return { positions: [], totalValue: 0, totalGainLoss: 0 };
    }

    // Get most recent snapshot for totals
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

    const positionsData = Array.from(positionsMap.values()).map((pos: any) => ({
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
      positions: positionsData,
      totalValue: latest.totalValue,
      totalGainLoss: latest.totalGainLoss,
    };
  }, [snapshots]);

  // Apply filters and sorting
  const {
    filtered,
    searchTerm,
    setSearchTerm,
    gainFilter,
    setGainFilter,
    sortBy,
    setSortBy,
  } = usePositionsFilter(positions);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

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
            Positions
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Détail de toutes vos positions actives
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
            {error instanceof Error ? error.message : 'Erreur lors du chargement des positions'}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      {positions.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom ou ISIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Gain Filter */}
              <Select value={gainFilter} onValueChange={(value: any) => setGainFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par performance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les positions</SelectItem>
                  <SelectItem value="positive">Gains uniquement</SelectItem>
                  <SelectItem value="negative">Pertes uniquement</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allocation">Allocation (desc)</SelectItem>
                  <SelectItem value="gain">Plus-value (desc)</SelectItem>
                  <SelectItem value="value">Valeur (desc)</SelectItem>
                  <SelectItem value="name">Nom (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            {searchTerm && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                {filtered.length} position{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {positions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FadeIn delay={0.1}>
            <Card className="border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Valeur Totale
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalValue)}
                </p>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.2}>
            <Card className={`border-slate-200 dark:border-slate-700 ${
              totalGainLoss >= 0
                ? 'bg-green-50 dark:bg-green-950/30'
                : 'bg-red-50 dark:bg-red-950/30'
            }`}>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Plus/Moins-Value
                </p>
                <div className="flex items-center gap-2">
                  {totalGainLoss >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <p className={`text-2xl font-bold ${
                    totalGainLoss >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(totalGainLoss)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.3}>
            <Card className="border-slate-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-950/30">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de Positions
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {positions.length}
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      )}

      {/* Positions Table */}
      {positions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-slate-500 dark:text-slate-400">
              Aucune position trouvée. Importez votre premier fichier pour voir vos positions.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-slate-500 dark:text-slate-400">
              Aucune position ne correspond aux critères de recherche.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length > 20 ? (
        <VirtualizedPositionsTable positions={filtered} />
      ) : (
        <PositionsTable positions={filtered} />
      )}
      </div>
    </PageTransition>
  );
}
