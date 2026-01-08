'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimePriceIndicatorProps {
  currentPrice: number;
  realtimePrice?: number;
  priceDifference?: number;
  priceDifferencePercentage?: number;
  currency?: string;
  showPercentage?: boolean;
  className?: string;
}

export function RealtimePriceIndicator({
  currentPrice,
  realtimePrice,
  priceDifference,
  priceDifferencePercentage,
  currency = '€',
  showPercentage = true,
  className,
}: RealtimePriceIndicatorProps) {
  const hasRealtimeData = realtimePrice !== undefined && realtimePrice !== null;
  const priceToDisplay = hasRealtimeData ? realtimePrice : currentPrice;
  const isPositive = (priceDifference || 0) > 0;
  const isNegative = (priceDifference || 0) < 0;
  const isNeutral = (priceDifference || 0) === 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Current/Realtime Price */}
      <span className="font-semibold text-lg">
        {priceToDisplay.toFixed(2)} {currency}
      </span>

      {/* Price Change Indicator */}
      {hasRealtimeData && priceDifference !== undefined && !isNeutral && (
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full',
            isPositive && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            isNegative && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {isPositive && <ArrowUp className="h-3 w-3" />}
          {isNegative && <ArrowDown className="h-3 w-3" />}

          <span>
            {Math.abs(priceDifference).toFixed(2)} {currency}
            {showPercentage && priceDifferencePercentage !== undefined && (
              <span className="ml-1">({Math.abs(priceDifferencePercentage).toFixed(2)}%)</span>
            )}
          </span>
        </div>
      )}

      {/* No Change Indicator */}
      {hasRealtimeData && isNeutral && (
        <div className="flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <Minus className="h-3 w-3" />
          <span>0.00 {currency}</span>
        </div>
      )}

      {/* Live Indicator */}
      {hasRealtimeData && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
        </div>
      )}
    </div>
  );
}
