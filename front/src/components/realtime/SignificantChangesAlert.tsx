'use client';

import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useSignificantChanges } from '@/hooks/useRealtimePrices';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SignificantChangesAlertProps {
  snapshotId: string;
  threshold?: number;
  className?: string;
}

export function SignificantChangesAlert({
  snapshotId,
  threshold = 2.0,
  className,
}: SignificantChangesAlertProps) {
  const { data: changes, isLoading } = useSignificantChanges(snapshotId, threshold);

  if (isLoading || !changes || changes.length === 0) {
    return null;
  }

  return (
    <Alert className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Changements Significatifs Détectés</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3 text-sm">
          {changes.length} position{changes.length > 1 ? 's ont' : ' a'} varié de plus de {threshold}% depuis le dernier snapshot.
        </p>

        <ScrollArea className="h-48">
          <div className="space-y-2">
            {changes.map((position, index) => {
              const isPositive = (position.priceDifferencePercentage || 0) > 0;

              return (
                <div
                  key={position.isin || index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{position.assetName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {position.currentPrice.toFixed(2)} € → {position.realtimePrice?.toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={isPositive ? 'default' : 'destructive'}
                    className={cn(
                      'ml-3 flex items-center gap-1',
                      isPositive && 'bg-green-500 hover:bg-green-600'
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? '+' : ''}
                    {position.priceDifferencePercentage?.toFixed(2)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Card variant for displaying significant changes
 */
export function SignificantChangesCard({
  snapshotId,
  threshold = 2.0,
  className,
}: SignificantChangesAlertProps) {
  const { data: changes, isLoading } = useSignificantChanges(snapshotId, threshold);

  if (isLoading || !changes || changes.length === 0) {
    return null;
  }

  // Sort by absolute percentage change (descending)
  const sortedChanges = [...changes].sort((a, b) => {
    const aChange = Math.abs(a.priceDifferencePercentage || 0);
    const bChange = Math.abs(b.priceDifferencePercentage || 0);
    return bChange - aChange;
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Mouvements Importants
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {sortedChanges.map((position, index) => {
              const isPositive = (position.priceDifferencePercentage || 0) > 0;
              const changeValue = Math.abs(position.priceDifference || 0);

              return (
                <div
                  key={position.isin || index}
                  className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{position.assetName}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>
                        {position.currentPrice.toFixed(2)} € → {position.realtimePrice?.toFixed(2)} €
                      </span>
                      <span>
                        {position.quantity} action{position.quantity > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div
                      className={cn(
                        'font-bold flex items-center gap-1 justify-end',
                        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {isPositive ? '+' : ''}
                      {position.priceDifferencePercentage?.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {isPositive ? '+' : '-'}
                      {changeValue.toFixed(2)} €
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
