'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AnalysisMetrics } from '@/lib/api';

interface PerformanceCardProps {
  metrics: AnalysisMetrics;
}

export function PerformanceCard({ metrics }: PerformanceCardProps) {
  const isPositive = metrics.totalGainLoss >= 0;

  return (
    <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Performance Globale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Montant Investi</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalInvested.toFixed(2)} €
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Valeur Actuelle</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalValue.toFixed(2)} €
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Plus/Moins-Value</p>
          <p
            className={`text-2xl font-bold ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {metrics.totalGainLoss.toFixed(2)} €
          </p>
          <p
            className={`text-lg ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {metrics.returnPercentage.toFixed(2)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
