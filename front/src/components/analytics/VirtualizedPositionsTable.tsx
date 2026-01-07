'use client';

import { List } from 'react-window';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Position } from '@/lib/api';

interface VirtualizedPositionsTableProps {
  positions: Position[];
}

const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 48;
const MAX_TABLE_HEIGHT = 600;

export function VirtualizedPositionsTable({ positions }: VirtualizedPositionsTableProps) {
  const tableHeight = Math.min(
    positions.length * ROW_HEIGHT + HEADER_HEIGHT,
    MAX_TABLE_HEIGHT
  );

  const Row = ({
    index,
    style,
    ariaAttributes
  }: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: {
      'aria-posinset': number;
      'aria-setsize': number;
      role: 'listitem';
    };
  }) => {
    const position = positions[index];
    const isPositive = position.gainLoss >= 0;

    return (
      <div
        style={style}
        {...ariaAttributes}
        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="grid grid-cols-6 gap-4 items-center h-full px-4">
          {/* Actif */}
          <div className="col-span-1">
            <div className="text-gray-900 dark:text-white font-medium text-sm">
              {position.assetName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {position.isin}
            </div>
          </div>

          {/* Quantité */}
          <div className="col-span-1 text-right text-gray-900 dark:text-white text-sm">
            {position.quantity}
          </div>

          {/* PRU */}
          <div className="col-span-1 text-right text-gray-900 dark:text-white text-sm">
            {position.pru.toFixed(2)} €
          </div>

          {/* Valeur */}
          <div className="col-span-1 text-right text-gray-900 dark:text-white text-sm">
            {position.currentValue.toFixed(2)} €
          </div>

          {/* +/- Value */}
          <div
            className={`col-span-1 text-right font-medium text-sm ${
              isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {position.gainLoss.toFixed(2)} €
          </div>

          {/* % */}
          <div
            className={`col-span-1 text-right text-sm ${
              isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {position.gainLossPercentage.toFixed(2)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">
          PRU et Positions par Actif ({positions.length} positions)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 mb-2">
          <div className="grid grid-cols-6 gap-4 px-4 py-3 font-medium text-sm">
            <div className="col-span-1 text-left text-gray-900 dark:text-white">Actif</div>
            <div className="col-span-1 text-right text-gray-900 dark:text-white">Quantité</div>
            <div className="col-span-1 text-right text-gray-900 dark:text-white">PRU</div>
            <div className="col-span-1 text-right text-gray-900 dark:text-white">Valeur</div>
            <div className="col-span-1 text-right text-gray-900 dark:text-white">+/- Value</div>
            <div className="col-span-1 text-right text-gray-900 dark:text-white">%</div>
          </div>
        </div>

        {/* Virtualized List */}
        <List
          defaultHeight={tableHeight - HEADER_HEIGHT}
          rowCount={positions.length}
          rowHeight={ROW_HEIGHT}
          rowComponent={Row}
          rowProps={{}}
          className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
        />
      </CardContent>
    </Card>
  );
}
