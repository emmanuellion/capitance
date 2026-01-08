import { http, HttpResponse } from 'msw';
import {
  createMockEnrichedSnapshot,
  createMockPerformanceSummary,
  createMockWorkerStats,
  createMockCacheStats,
} from '../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const handlers = [
  // CSRF Token
  http.get(`${BASE_URL}/api/csrf-token`, () => {
    return HttpResponse.json({
      token: 'test-csrf-token',
    });
  }),

  // Get latest enriched snapshot
  http.get(`${API_URL}/realtime/snapshots/latest`, () => {
    return HttpResponse.json({
      success: true,
      data: createMockEnrichedSnapshot(),
    });
  }),

  // Get enriched snapshot by ID
  http.get(`${API_URL}/realtime/snapshots/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createMockEnrichedSnapshot({ _id: params.id as string }),
    });
  }),

  // Get performance summary
  http.get(`${API_URL}/realtime/snapshots/:id/performance`, () => {
    return HttpResponse.json({
      success: true,
      data: createMockPerformanceSummary(),
    });
  }),

  // Get significant changes
  http.get(`${API_URL}/realtime/snapshots/:id/changes`, ({ request }) => {
    const url = new URL(request.url);
    const threshold = parseFloat(url.searchParams.get('threshold') || '2.0');

    return HttpResponse.json({
      success: true,
      data: [
        {
          isin: 'US0378331005',
          assetName: 'Apple Inc. (AAPL)',
          symbol: 'AAPL',
          snapshotPrice: 150.0,
          realtimePrice: 155.0,
          priceChange: 5.0,
          priceChangePercentage: 3.33,
          currentValue: 1550.0,
          direction: 'up',
        },
      ],
    });
  }),

  // Get worker stats
  http.get(`${API_URL}/realtime/worker/stats`, () => {
    return HttpResponse.json({
      success: true,
      data: createMockWorkerStats(),
    });
  }),

  // Get cache stats
  http.get(`${API_URL}/realtime/cache/stats`, () => {
    return HttpResponse.json({
      success: true,
      data: createMockCacheStats(),
    });
  }),

  // Force refresh prices
  http.post(`${API_URL}/realtime/refresh`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Price refresh initiated',
      data: {
        symbolsQueued: 25,
      },
    });
  }),

  // Clear price cache
  http.post(`${API_URL}/realtime/cache/clear`, async ({ request }) => {
    const body = await request.json();
    const symbols = (body as any)?.symbols || [];

    return HttpResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      data: {
        clearedKeys: symbols.length || 150,
      },
    });
  }),

  // Auth endpoints
  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json({
      user: {
        _id: 'user-123',
        email: 'test@example.com',
        isVerified: true,
      },
    });
  }),

  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    const { email, password } = body as any;

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        success: true,
        user: {
          _id: 'user-123',
          email: 'test@example.com',
          isVerified: true,
        },
      });
    }

    return HttpResponse.json(
      {
        success: false,
        error: 'Invalid credentials',
      },
      { status: 401 }
    );
  }),

  // Snapshots endpoints
  http.get(`${API_URL}/snapshots`, () => {
    return HttpResponse.json({
      success: true,
      snapshots: [
        {
          _id: 'snapshot-123',
          totalValue: 10000,
          totalGainLoss: 2000,
          totalGainLossPercentage: 20.0,
          snapshotDate: new Date('2024-01-15'),
        },
      ],
    });
  }),
];
