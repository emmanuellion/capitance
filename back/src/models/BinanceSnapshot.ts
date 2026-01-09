import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';
import type { BinancePortfolioData } from '../services/binanceService.js';
import config from '../config/config.js';

export interface BinanceSnapshot {
    _id?: ObjectId;
    userId: ObjectId;
    portfolioData: BinancePortfolioData;
    snapshotDate: Date;
    createdAt: Date;
    ttl: Date; // TTL index will auto-delete after this date
}

export interface BinanceSnapshotSummary {
    _id: string;
    snapshotDate: Date;
    totalValueUSDT: number;
    totalValueEUR: number | null;
    totalPnlUSDT: number;
    totalPnlEUR: number | null;
    assetCount: number;
    createdAt: Date;
}

export function getBinanceSnapshotsCollection(): Collection<BinanceSnapshot> {
    const db = getDatabase();
    return db.collection<BinanceSnapshot>('binanceSnapshots');
}

/**
 * Initialize indexes for binance snapshots collection
 */
export async function initializeBinanceSnapshotIndexes(): Promise<void> {
    const collection = getBinanceSnapshotsCollection();

    // Index on userId and snapshotDate for efficient queries
    await collection.createIndex({ userId: 1, snapshotDate: -1 });

    // TTL index for automatic deletion after 90 days
    await collection.createIndex({ ttl: 1 }, { expireAfterSeconds: 0 });

    // Index on createdAt for general queries
    await collection.createIndex({ createdAt: -1 });
}

/**
 * Create a new Binance snapshot
 * @param userId User ID
 * @param portfolioData Portfolio data from Binance
 * @param snapshotDate Date of the snapshot (defaults to now)
 * @returns Created snapshot ID
 */
export async function createBinanceSnapshot(
    userId: string,
    portfolioData: BinancePortfolioData,
    snapshotDate?: Date
): Promise<ObjectId> {
    const collection = getBinanceSnapshotsCollection();

    const now = new Date();
    const ttlDate = new Date(now.getTime() + config.binance.snapshotTTL);

    const snapshot: Omit<BinanceSnapshot, '_id'> = {
        userId: new ObjectId(userId),
        portfolioData,
        snapshotDate: snapshotDate || now,
        createdAt: now,
        ttl: ttlDate,
    };

    const result = await collection.insertOne(snapshot);
    return result.insertedId;
}

/**
 * Get all snapshots for a user
 * @param userId User ID
 * @param options Query options (limit, skip, startDate, endDate)
 * @returns Array of snapshots
 */
export async function getBinanceSnapshots(
    userId: string,
    options: {
        limit?: number;
        skip?: number;
        startDate?: Date;
        endDate?: Date;
    } = {}
): Promise<BinanceSnapshot[]> {
    const collection = getBinanceSnapshotsCollection();

    const query: any = { userId: new ObjectId(userId) };

    if (options.startDate || options.endDate) {
        query.snapshotDate = {};
        if (options.startDate) query.snapshotDate.$gte = options.startDate;
        if (options.endDate) query.snapshotDate.$lte = options.endDate;
    }

    return collection
        .find(query)
        .sort({ snapshotDate: -1 })
        .skip(options.skip || 0)
        .limit(options.limit || 100)
        .toArray();
}

/**
 * Get snapshot summaries (without full portfolio data) for listing
 * @param userId User ID
 * @param options Query options
 * @returns Array of snapshot summaries
 */
export async function getBinanceSnapshotSummaries(
    userId: string,
    options: {
        limit?: number;
        skip?: number;
        startDate?: Date;
        endDate?: Date;
    } = {}
): Promise<BinanceSnapshotSummary[]> {
    const collection = getBinanceSnapshotsCollection();

    const query: any = { userId: new ObjectId(userId) };

    if (options.startDate || options.endDate) {
        query.snapshotDate = {};
        if (options.startDate) query.snapshotDate.$gte = options.startDate;
        if (options.endDate) query.snapshotDate.$lte = options.endDate;
    }

    const snapshots = await collection
        .find(query)
        .sort({ snapshotDate: -1 })
        .skip(options.skip || 0)
        .limit(options.limit || 100)
        .toArray();

    return snapshots.map((snapshot) => ({
        _id: snapshot._id!.toString(),
        snapshotDate: snapshot.snapshotDate,
        totalValueUSDT: snapshot.portfolioData.totals.usdt,
        totalValueEUR: snapshot.portfolioData.totals.eur,
        totalPnlUSDT: snapshot.portfolioData.pnl.pnlTotals.pnlUSDT,
        totalPnlEUR: snapshot.portfolioData.pnl.pnlTotals.pnlEUR,
        assetCount: snapshot.portfolioData.assets.length,
        createdAt: snapshot.createdAt,
    }));
}

/**
 * Get a single snapshot by ID
 * @param snapshotId Snapshot ID
 * @param userId User ID (for authorization)
 * @returns Snapshot or null if not found
 */
export async function getBinanceSnapshotById(
    snapshotId: string,
    userId: string
): Promise<BinanceSnapshot | null> {
    const collection = getBinanceSnapshotsCollection();

    return collection.findOne({
        _id: new ObjectId(snapshotId),
        userId: new ObjectId(userId),
    });
}

/**
 * Get the latest snapshot for a user
 * @param userId User ID
 * @returns Latest snapshot or null if none exist
 */
export async function getLatestBinanceSnapshot(userId: string): Promise<BinanceSnapshot | null> {
    const collection = getBinanceSnapshotsCollection();

    return collection.findOne(
        { userId: new ObjectId(userId) },
        { sort: { snapshotDate: -1 } }
    );
}

/**
 * Delete a snapshot by ID
 * @param snapshotId Snapshot ID
 * @param userId User ID (for authorization)
 * @returns true if deleted successfully
 */
export async function deleteBinanceSnapshot(
    snapshotId: string,
    userId: string
): Promise<boolean> {
    const collection = getBinanceSnapshotsCollection();

    const result = await collection.deleteOne({
        _id: new ObjectId(snapshotId),
        userId: new ObjectId(userId),
    });

    return result.deletedCount === 1;
}

/**
 * Delete all snapshots for a user
 * @param userId User ID
 * @returns Number of snapshots deleted
 */
export async function deleteAllBinanceSnapshots(userId: string): Promise<number> {
    const collection = getBinanceSnapshotsCollection();

    const result = await collection.deleteMany({
        userId: new ObjectId(userId),
    });

    return result.deletedCount;
}

/**
 * Check if a snapshot exists for a specific date
 * @param userId User ID
 * @param date Date to check (will match snapshots on the same day)
 * @returns true if a snapshot exists for that day
 */
export async function hasSnapshotForDate(userId: string, date: Date): Promise<boolean> {
    const collection = getBinanceSnapshotsCollection();

    // Get start and end of the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await collection.countDocuments({
        userId: new ObjectId(userId),
        snapshotDate: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
    });

    return count > 0;
}

/**
 * Get portfolio evolution (timeline) data
 * @param userId User ID
 * @param options Query options
 * @returns Array of timeline points with date and portfolio value
 */
export async function getBinancePortfolioTimeline(
    userId: string,
    options: {
        startDate?: Date;
        endDate?: Date;
    } = {}
): Promise<Array<{ date: Date; totalValueUSDT: number; totalValueEUR: number | null; totalPnlUSDT: number }>> {
    const snapshots = await getBinanceSnapshotSummaries(userId, options);

    return snapshots.map((s) => ({
        date: s.snapshotDate,
        totalValueUSDT: s.totalValueUSDT,
        totalValueEUR: s.totalValueEUR,
        totalPnlUSDT: s.totalPnlUSDT,
    }));
}
