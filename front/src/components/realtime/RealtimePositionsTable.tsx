'use client';

import { useState } from 'react';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useEnrichedSnapshot } from '@/hooks/useRealtimePrices';
import type { EnrichedPosition } from '@/hooks/useRealtimePrices';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface RealtimePositionsTableProps {
  snapshotId: string;
  className?: string;
}

type SortField = 'assetName' | 'currentValue' | 'realtimeValue' | 'gainLoss' | 'priceDifferencePercentage';
type SortDirection = 'asc' | 'desc';

export function RealtimePositionsTable({ snapshotId, className }: RealtimePositionsTableProps) {
  const { data: snapshot, isLoading } = useEnrichedSnapshot(snapshotId);
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!snapshot) {
    return <div className={className}>Aucune donnée disponible</div>;
  }

  // Sort positions
  const sortedPositions = [...snapshot.positions].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sortField) {
      case 'assetName':
        return sortDirection === 'asc'
          ? a.assetName.localeCompare(b.assetName)
          : b.assetName.localeCompare(a.assetName);

      case 'currentValue':
        aValue = a.currentValue;
        bValue = b.currentValue;
        break;

      case 'realtimeValue':
        aValue = a.realtimeValue || a.currentValue;
        bValue = b.realtimeValue || b.currentValue;
        break;

      case 'gainLoss':
        aValue = a.realtimeGainLoss || a.gainLoss;
        bValue = b.realtimeGainLoss || b.gainLoss;
        break;

      case 'priceDifferencePercentage':
        aValue = Math.abs(a.priceDifferencePercentage || 0);
        bValue = Math.abs(b.priceDifferencePercentage || 0);
        break;

      default:
        aValue = 0;
        bValue = 0;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('assetName')}
                className="cursor-pointer hover:scale-105 transition-all duration-200"
              >
                Actif
                <ArrowUpDown className={cn(
                  "ml-2 h-4 w-4 transition-transform duration-300",
                  sortField === 'assetName' && "text-primary scale-110"
                )} />
              </Button>
            </TableHead>
            <TableHead className="text-right">Quantité</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('realtimeValue')}
                className="cursor-pointer hover:scale-105 transition-all duration-200"
              >
                Valeur
                <ArrowUpDown className={cn(
                  "ml-2 h-4 w-4 transition-transform duration-300",
                  sortField === 'realtimeValue' && "text-primary scale-110"
                )} />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('gainLoss')}
                className="cursor-pointer hover:scale-105 transition-all duration-200"
              >
                +/- Value
                <ArrowUpDown className={cn(
                  "ml-2 h-4 w-4 transition-transform duration-300",
                  sortField === 'gainLoss' && "text-primary scale-110"
                )} />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('priceDifferencePercentage')}
                className="cursor-pointer hover:scale-105 transition-all duration-200"
              >
                Variation
                <ArrowUpDown className={cn(
                  "ml-2 h-4 w-4 transition-transform duration-300",
                  sortField === 'priceDifferencePercentage' && "text-primary scale-110"
                )} />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPositions.map((position) => {
            const hasRealtime = position.realtimePrice !== undefined;
            const isPositive = (position.priceDifference || 0) > 0;
            const isNegative = (position.priceDifference || 0) < 0;
            const gainIsPositive = (position.realtimeGainLoss || position.gainLoss) >= 0;

            return (
              <TableRow key={position.isin}>
                <TableCell className="font-medium">
                  <div>
                    <p>{position.assetName}</p>
                    {position.symbol && (
                      <p className="text-xs text-muted-foreground mt-0.5">{position.symbol}</p>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right">{position.quantity}</TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>
                      {(hasRealtime ? position.realtimePrice : position.currentPrice)?.toFixed(2)} €
                    </span>
                    {hasRealtime && (
                      <div className="h-2 w-2 rounded-full bg-green-500" title="Prix en temps réel" />
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right font-medium">
                  {(hasRealtime ? position.realtimeValue : position.currentValue)?.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €
                </TableCell>

                <TableCell className="text-right">
                  <span
                    className={cn(
                      'font-medium',
                      gainIsPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {gainIsPositive ? '+' : ''}
                    {(hasRealtime ? position.realtimeGainLoss : position.gainLoss)?.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {gainIsPositive ? '+' : ''}
                    {(hasRealtime ? position.realtimeGainLossPercentage : position.gainLossPercentage)?.toFixed(2)}%
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  {hasRealtime && position.priceDifference !== undefined && position.priceDifference !== 0 ? (
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
                        isPositive && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        isNegative && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}
                    >
                      {isPositive && <TrendingUp className="h-3 w-3" />}
                      {isNegative && <TrendingDown className="h-3 w-3" />}
                      <span>
                        {isPositive ? '+' : ''}
                        {position.priceDifferencePercentage?.toFixed(2)}%
                      </span>
                    </div>
                  ) : hasRealtime ? (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      <Minus className="h-3 w-3" />
                      <span>0.00%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
