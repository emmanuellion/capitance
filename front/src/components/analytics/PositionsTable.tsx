'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Position } from '@/lib/api';

interface PositionsTableProps {
  positions: Position[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">PRU et Positions par Actif</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Actif</th>
                <th className="text-right py-3 px-4 text-gray-900 dark:text-white">Quantité</th>
                <th className="text-right py-3 px-4 text-gray-900 dark:text-white">PRU</th>
                <th className="text-right py-3 px-4 text-gray-900 dark:text-white">Valeur</th>
                <th className="text-right py-3 px-4 text-gray-900 dark:text-white">+/- Value</th>
                <th className="text-right py-3 px-4 text-gray-900 dark:text-white">%</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const isPositive = position.gainLoss >= 0;
                return (
                  <tr
                    key={position.isin}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {position.assetName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {position.isin}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {position.quantity}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {position.pru.toFixed(2)} €
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {position.currentValue.toFixed(2)} €
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-medium ${
                        isPositive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {position.gainLoss.toFixed(2)} €
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        isPositive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {position.gainLossPercentage.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
