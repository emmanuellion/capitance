import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a test QueryClient with disabled retries and caching
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
};

interface AllTheProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper component with all necessary providers
 */
export const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

/**
 * Custom render function that includes providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

/**
 * Create a mock enriched snapshot
 */
export const createMockEnrichedSnapshot = (overrides = {}) => ({
  _id: 'snapshot-123',
  uploadId: 'upload-123',
  userId: 'user-123',
  snapshotDate: new Date('2024-01-15'),
  positions: [
    {
      isin: 'US0378331005',
      assetName: 'Apple Inc. (AAPL)',
      symbol: 'AAPL',
      quantity: 10,
      currentPrice: 150.0,
      currentValue: 1500.0,
      averageBuyingPrice: 120.0,
      totalInvested: 1200.0,
      gainLoss: 300.0,
      gainLossPercentage: 25.0,
      realtimePrice: 155.0,
      realtimeValue: 1550.0,
      realtimeGainLoss: 350.0,
      realtimeGainLossPercentage: 29.17,
      priceDifference: 5.0,
      priceDifferencePercentage: 3.33,
      priceLastUpdated: new Date('2024-01-15T12:00:00'),
    },
  ],
  metadata: {
    formatType: 'boursobank_snapshot',
    bankName: 'Boursobank',
  },
  totalValue: 1500.0,
  totalInvested: 1200.0,
  totalGainLoss: 300.0,
  totalGainLossPercentage: 25.0,
  realtimeTotalValue: 1550.0,
  realtimeTotalGainLoss: 350.0,
  realtimeTotalGainLossPercentage: 29.17,
  totalValueDifference: 50.0,
  totalValueDifferencePercentage: 3.33,
  enrichedAt: new Date('2024-01-15T12:00:00'),
  pricesAvailable: 1,
  createdAt: new Date('2024-01-15'),
  ...overrides,
});

/**
 * Create a mock position
 */
export const createMockPosition = (overrides = {}) => ({
  isin: 'US0378331005',
  assetName: 'Apple Inc. (AAPL)',
  symbol: 'AAPL',
  quantity: 10,
  currentPrice: 150.0,
  currentValue: 1500.0,
  averageBuyingPrice: 120.0,
  totalInvested: 1200.0,
  gainLoss: 300.0,
  gainLossPercentage: 25.0,
  realtimePrice: 155.0,
  realtimeValue: 1550.0,
  realtimeGainLoss: 350.0,
  realtimeGainLossPercentage: 29.17,
  priceDifference: 5.0,
  priceDifferencePercentage: 3.33,
  currency: 'USD',
  ...overrides,
});

/**
 * Create mock performance summary
 */
export const createMockPerformanceSummary = (overrides = {}) => ({
  snapshot: {
    totalValue: 10000,
    totalGainLoss: 2000,
    totalGainLossPercentage: 20.0,
  },
  realtime: {
    totalValue: 10500,
    totalGainLoss: 2500,
    totalGainLossPercentage: 25.0,
  },
  change: {
    valueChange: 500,
    valueChangePercentage: 5.0,
  },
  metadata: {
    snapshotDate: new Date('2024-01-15'),
    enrichedAt: new Date('2024-01-15T12:00:00'),
    pricesAvailable: 10,
    totalPositions: 10,
  },
  ...overrides,
});

/**
 * Create mock worker stats
 */
export const createMockWorkerStats = (overrides = {}) => ({
  lastRun: new Date('2024-01-15T12:00:00'),
  nextRun: new Date('2024-01-15T12:05:00'),
  uniqueSymbols: 25,
  pricesUpdated: 25,
  errors: 0,
  isRunning: false,
  ...overrides,
});

/**
 * Create mock cache stats
 */
export const createMockCacheStats = (overrides = {}) => ({
  totalPrices: 150,
  totalMappings: 200,
  apiUsage: {
    twelveData: {
      dailyLimit: 800,
      usedToday: 245,
      remainingToday: 555,
    },
    alphaVantage: {
      dailyLimit: 500,
      usedToday: 120,
      remainingToday: 380,
    },
  },
  ...overrides,
});

/**
 * Wait for loading to finish (helper for async tests)
 */
export const waitForLoadingToFinish = async (screen: any) => {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });
};
