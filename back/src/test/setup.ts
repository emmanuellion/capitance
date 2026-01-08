import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;

// Setup MongoDB in-memory server before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();

  // Set test environment variables
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-minimum-length';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-minimum-length';
  process.env.JWT_ACCESS_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';
  process.env.REDIS_ENABLED = 'false'; // Disable Redis in tests by default
}, 60000); // 60s timeout for MongoDB setup

// Cleanup after each test
afterEach(async () => {
  if (mongoClient) {
    const db = mongoClient.db();
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }

  // Clear all mocks
  vi.clearAllMocks();
});

// Teardown after all tests
afterAll(async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Export test database helper
export function getTestDatabase() {
  if (!mongoClient) {
    throw new Error('MongoDB test client not initialized');
  }
  return mongoClient.db();
}
