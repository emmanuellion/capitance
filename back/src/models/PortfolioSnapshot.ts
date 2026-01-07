import type { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';
import type { PortfolioSnapshot } from '../types/snapshot.types.js';

export function getPortfolioSnapshotCollection(): Collection<PortfolioSnapshot> {
  const db = getDatabase();
  return db.collection<PortfolioSnapshot>('portfolioSnapshots');
}

export async function initializePortfolioSnapshotIndexes(): Promise<void> {
  const collection = getPortfolioSnapshotCollection();
  await collection.createIndex({ uploadId: 1 }, { unique: true });
  await collection.createIndex({ userId: 1, snapshotDate: -1 });
  await collection.createIndex({ userId: 1, 'metadata.formatType': 1 });
  await collection.createIndex({ 'positions.isin': 1 });
  console.log('Portfolio snapshot indexes created successfully');
}

export async function createSnapshot(snapshot: Omit<PortfolioSnapshot, '_id'>): Promise<ObjectId> {
  const collection = getPortfolioSnapshotCollection();
  const result = await collection.insertOne(snapshot as PortfolioSnapshot);
  return result.insertedId;
}

export async function getSnapshotByUploadId(uploadId: string): Promise<PortfolioSnapshot | null> {
  const collection = getPortfolioSnapshotCollection();
  const { ObjectId } = await import('mongodb');
  return collection.findOne({ uploadId: new ObjectId(uploadId) });
}

export async function getSnapshotById(snapshotId: string): Promise<PortfolioSnapshot | null> {
  const collection = getPortfolioSnapshotCollection();
  const { ObjectId } = await import('mongodb');
  return collection.findOne({ _id: new ObjectId(snapshotId) });
}

export interface GetSnapshotsOptions {
  startDate?: Date;
  endDate?: Date;
  formatType?: string;
  limit?: number;
  offset?: number;
}

export async function getSnapshotsByUserId(
  userId: string,
  options?: GetSnapshotsOptions
): Promise<PortfolioSnapshot[]> {
  const collection = getPortfolioSnapshotCollection();
  const query: any = { userId };

  if (options?.startDate || options?.endDate) {
    query.snapshotDate = {};
    if (options.startDate) {
      query.snapshotDate.$gte = options.startDate;
    }
    if (options.endDate) {
      query.snapshotDate.$lte = options.endDate;
    }
  }

  if (options?.formatType) {
    query['metadata.formatType'] = options.formatType;
  }

  let cursor = collection.find(query).sort({ snapshotDate: -1 });

  if (options?.offset) {
    cursor = cursor.skip(options.offset);
  }

  if (options?.limit) {
    cursor = cursor.limit(options.limit);
  }

  return cursor.toArray();
}

export async function getSnapshotsByPosition(
  userId: string,
  isin: string
): Promise<PortfolioSnapshot[]> {
  const collection = getPortfolioSnapshotCollection();
  return collection
    .find({
      userId,
      'positions.isin': isin,
    })
    .sort({ snapshotDate: 1 })
    .toArray();
}

export async function updateSnapshot(
  snapshotId: string,
  updates: Partial<PortfolioSnapshot>
): Promise<boolean> {
  const collection = getPortfolioSnapshotCollection();
  const { ObjectId } = await import('mongodb');
  const result = await collection.updateOne(
    { _id: new ObjectId(snapshotId) },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return result.modifiedCount === 1;
}

export async function deleteSnapshotByUploadId(uploadId: string): Promise<boolean> {
  const collection = getPortfolioSnapshotCollection();
  const { ObjectId } = await import('mongodb');
  const result = await collection.deleteOne({ uploadId: new ObjectId(uploadId) });
  return result.deletedCount === 1;
}

export async function deleteSnapshotById(snapshotId: string): Promise<boolean> {
  const collection = getPortfolioSnapshotCollection();
  const { ObjectId } = await import('mongodb');
  const result = await collection.deleteOne({ _id: new ObjectId(snapshotId) });
  return result.deletedCount === 1;
}
