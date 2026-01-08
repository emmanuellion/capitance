import { getDatabase } from '../config/database.js';
import type { Collection, Document } from 'mongodb';

export interface SymbolMapping extends Document {
  isin: string;
  ticker: string;
  name: string;
  exchange?: string;
  currency?: string;
  type?: 'stock' | 'etf' | 'fund';
  source?: 'manual' | 'api' | 'predefined';
  verified?: boolean;
  lastVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

let collection: Collection<SymbolMapping> | null = null;

export function getSymbolMappingCollection(): Collection<SymbolMapping> {
  if (!collection) {
    const db = getDatabase();
    collection = db.collection<SymbolMapping>('symbol_mappings');
  }
  return collection;
}

/**
 * Initialize indexes for symbol_mappings collection
 */
export async function initializeSymbolMappingIndexes(): Promise<void> {
  const coll = getSymbolMappingCollection();

  // Unique index on ISIN
  await coll.createIndex({ isin: 1 }, { unique: true });

  // Index on ticker for reverse lookups
  await coll.createIndex({ ticker: 1 });

  // Index on type for filtering
  await coll.createIndex({ type: 1 });

  console.log('✅ Symbol mapping indexes created successfully');
}

/**
 * Get ticker by ISIN
 */
export async function getTickerByISIN(isin: string): Promise<string | null> {
  const coll = getSymbolMappingCollection();
  const mapping = await coll.findOne({ isin });
  return mapping?.ticker || null;
}

/**
 * Get ISIN by ticker
 */
export async function getISINByTicker(ticker: string): Promise<string | null> {
  const coll = getSymbolMappingCollection();
  const mapping = await coll.findOne({ ticker });
  return mapping?.isin || null;
}

/**
 * Add or update a symbol mapping
 */
export async function upsertSymbolMapping(
  isin: string,
  ticker: string,
  data: Partial<SymbolMapping>
): Promise<void> {
  const coll = getSymbolMappingCollection();
  await coll.updateOne(
    { isin },
    {
      $set: {
        ticker,
        ...data,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        isin,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Bulk insert symbol mappings
 */
export async function bulkInsertMappings(
  mappings: Array<Omit<SymbolMapping, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const coll = getSymbolMappingCollection();
  const now = new Date();

  const operations = mappings.map((mapping) => ({
    updateOne: {
      filter: { isin: mapping.isin },
      update: {
        $set: {
          ...mapping,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await coll.bulkWrite(operations);
  }
}

/**
 * Delete a symbol mapping
 */
export async function deleteSymbolMapping(isin: string): Promise<boolean> {
  const coll = getSymbolMappingCollection();
  const result = await coll.deleteOne({ isin });
  return result.deletedCount > 0;
}

/**
 * Get all symbol mappings with optional filters
 */
export async function getAllMappings(filters?: {
  type?: string;
  verified?: boolean;
}): Promise<SymbolMapping[]> {
  const coll = getSymbolMappingCollection();
  const query: any = {};

  if (filters?.type) {
    query.type = filters.type;
  }
  if (filters?.verified !== undefined) {
    query.verified = filters.verified;
  }

  return await coll.find(query).sort({ name: 1 }).toArray();
}
