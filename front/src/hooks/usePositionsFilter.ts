import { useState, useMemo } from 'react';

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

export type GainFilter = 'all' | 'positive' | 'negative';
export type SortBy = 'allocation' | 'gain' | 'name' | 'value';

export function usePositionsFilter(positions: Position[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gainFilter, setGainFilter] = useState<GainFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('allocation');

  const filtered = useMemo(() => {
    let result = [...positions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.assetName.toLowerCase().includes(term) ||
          p.isin.toLowerCase().includes(term)
      );
    }

    // Gain/Loss filter
    if (gainFilter === 'positive') {
      result = result.filter((p) => p.gainLoss >= 0);
    } else if (gainFilter === 'negative') {
      result = result.filter((p) => p.gainLoss < 0);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'allocation':
          return b.allocationPercentage - a.allocationPercentage;
        case 'gain':
          return b.gainLoss - a.gainLoss;
        case 'value':
          return b.currentValue - a.currentValue;
        case 'name':
          return a.assetName.localeCompare(b.assetName);
        default:
          return 0;
      }
    });

    return result;
  }, [positions, searchTerm, gainFilter, sortBy]);

  return {
    filtered,
    searchTerm,
    setSearchTerm,
    gainFilter,
    setGainFilter,
    sortBy,
    setSortBy,
  };
}
