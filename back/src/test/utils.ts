import { Db, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import redisMock from 'redis-mock';
import { vi } from 'vitest';

/**
 * Create a mock Redis client for tests
 */
export function createMockRedisClient() {
  const client = redisMock.createClient();

  // Convert callbacks to promises for easier testing
  const promisifiedClient = {
    get: vi.fn((key: string) => {
      return new Promise((resolve, reject) => {
        client.get(key, (err: Error | null, result: string | null) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    }),
    set: vi.fn((key: string, value: string, ...args: any[]) => {
      return new Promise((resolve, reject) => {
        client.set(key, value, ...args, (err: Error | null) => {
          if (err) reject(err);
          else resolve('OK');
        });
      });
    }),
    del: vi.fn((key: string) => {
      return new Promise((resolve, reject) => {
        client.del(key, (err: Error | null, count: number) => {
          if (err) reject(err);
          else resolve(count);
        });
      });
    }),
    mget: vi.fn((...keys: string[]) => {
      return new Promise((resolve, reject) => {
        client.mget(...keys, (err: Error | null, results: (string | null)[]) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    }),
    keys: vi.fn((pattern: string) => {
      return new Promise((resolve, reject) => {
        client.keys(pattern, (err: Error | null, keys: string[]) => {
          if (err) reject(err);
          else resolve(keys);
        });
      });
    }),
    quit: vi.fn(() => Promise.resolve()),
  };

  return promisifiedClient;
}

/**
 * Generate a test JWT token
 */
export function generateTestToken(userId: string, expiresIn: string = '1h'): string {
  const secret = process.env.JWT_ACCESS_SECRET || 'test-secret-32-chars-minimum-length';
  return jwt.sign({ userId }, secret, { expiresIn });
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  db: Db,
  userData: Partial<{
    email: string;
    password: string;
    isVerified: boolean;
    refreshTokens: string[];
  }> = {}
) {
  const user = {
    email: userData.email || 'test@example.com',
    password: userData.password || '$2a$12$dummyhashedpasswordfortest',
    isVerified: userData.isVerified !== false,
    verificationToken: undefined,
    verificationTokenExpiry: undefined,
    resetPasswordToken: undefined,
    resetPasswordTokenExpiry: undefined,
    refreshTokens: userData.refreshTokens || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('users').insertOne(user);
  return { ...user, _id: result.insertedId };
}

/**
 * Create a test upload in the database
 */
export async function createTestUpload(
  db: Db,
  userId: string,
  uploadData: Partial<any> = {}
) {
  const upload = {
    userId,
    originalName: uploadData.originalName || 'test-portfolio.csv',
    filename: uploadData.filename || `${Date.now()}-test.csv`,
    size: uploadData.size || 1000,
    mimetype: uploadData.mimetype || 'text/csv',
    uploadedAt: uploadData.uploadedAt || new Date(),
    filePath: uploadData.filePath || '/uploads/test.csv',
    formatType: uploadData.formatType || 'boursobank_snapshot',
    formatDetectionConfidence: uploadData.formatDetectionConfidence || 0.95,
    snapshotDate: uploadData.snapshotDate || new Date(),
    processingStatus: uploadData.processingStatus || 'processed',
  };

  const result = await db.collection('uploads').insertOne(upload);
  return { ...upload, _id: result.insertedId };
}

/**
 * Create a test snapshot in the database
 */
export async function createTestSnapshot(
  db: Db,
  userId: string,
  uploadId: ObjectId,
  snapshotData: Partial<any> = {}
) {
  const snapshot = {
    uploadId,
    userId,
    snapshotDate: snapshotData.snapshotDate || new Date(),
    positions: snapshotData.positions || [
      {
        isin: 'US0378331005',
        assetName: 'Apple Inc. (AAPL)',
        quantity: 10,
        currentPrice: 150.0,
        currentValue: 1500.0,
        averageBuyingPrice: 120.0,
        totalInvested: 1200.0,
        gainLoss: 300.0,
        gainLossPercentage: 25.0,
        symbol: 'AAPL',
      },
    ],
    metadata: snapshotData.metadata || {
      formatType: 'boursobank_snapshot',
      bankName: 'Boursobank',
      detectionConfidence: 0.95,
      parseWarnings: [],
    },
    totalValue: snapshotData.totalValue || 1500.0,
    totalInvested: snapshotData.totalInvested || 1200.0,
    totalGainLoss: snapshotData.totalGainLoss || 300.0,
    totalGainLossPercentage: snapshotData.totalGainLossPercentage || 25.0,
    createdAt: snapshotData.createdAt || new Date(),
    updatedAt: snapshotData.updatedAt || new Date(),
  };

  const result = await db.collection('portfolioSnapshots').insertOne(snapshot);
  return { ...snapshot, _id: result.insertedId };
}

/**
 * Create a test symbol mapping in the database
 */
export async function createTestSymbolMapping(
  db: Db,
  mappingData: Partial<any> = {}
) {
  const mapping = {
    isin: mappingData.isin || 'US0378331005',
    ticker: mappingData.ticker || 'AAPL',
    name: mappingData.name || 'Apple Inc.',
    exchange: mappingData.exchange || 'NASDAQ',
    currency: mappingData.currency || 'USD',
    type: mappingData.type || 'stock',
    source: mappingData.source || 'predefined',
    verified: mappingData.verified !== false,
    lastVerified: mappingData.lastVerified || new Date(),
    createdAt: mappingData.createdAt || new Date(),
    updatedAt: mappingData.updatedAt || new Date(),
  };

  const result = await db.collection('symbol_mappings').insertOne(mapping);
  return { ...mapping, _id: result.insertedId };
}

/**
 * Mock fetch for testing external API calls
 */
export function mockFetch(response: any, status: number = 200) {
  return vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    })
  );
}

/**
 * Wait for async operations in tests
 */
export function wait(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
