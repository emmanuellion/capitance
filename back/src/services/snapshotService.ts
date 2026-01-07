import fs from 'fs';
import type { ObjectId } from 'mongodb';
import { parserFactory } from './parsers/ParserFactory.js';
import './parsers/BoursobankSnapshotParser.js'; // Ensure parser is registered
import './parsers/TradeRepublicParser.js'; // Ensure parser is registered
import './parsers/InteractiveBrokersParser.js'; // Ensure parser is registered
import './parsers/GenericCSVParser.js'; // Ensure parser is registered
import { createSnapshot, getSnapshotsByUserId, getSnapshotsByPosition } from '../models/PortfolioSnapshot.js';
import { getSnapshotDate } from '../utils/dateUtils.js';
import type { PortfolioSnapshot, NormalizedPosition, TimelineEntry, PositionHistory, SnapshotFormatType } from '../types/snapshot.types.js';
import type { ParseResult, FormatDetectionResult } from '../types/parser.types.js';

export interface ProcessResult {
  snapshotId: ObjectId;
  snapshot: PortfolioSnapshot;
  detection: FormatDetectionResult | null;
  parseResult: ParseResult;
}

/**
 * Process uploaded file and create snapshot
 */
export async function processUpload(
  filePath: string,
  userId: string,
  uploadId: ObjectId,
  originalFilename: string,
  formatType?: SnapshotFormatType,
  snapshotDate?: Date | string
): Promise<ProcessResult> {
  // Read file
  const fileContent = await fs.promises.readFile(filePath, 'utf-8');

  // Get parser (auto-detect or use specified)
  let parser;
  let detection: FormatDetectionResult | null = null;

  if (formatType) {
    parser = parserFactory.getParser(formatType);
    if (!parser) {
      throw new Error(`Unsupported format type: ${formatType}`);
    }
  } else {
    const result = await parserFactory.detectAndGetParser(fileContent);
    parser = result.parser;
    detection = result.detection;

    if (!parser) {
      throw new Error(
        `Unable to detect format. Confidence: ${detection?.confidence || 0}. ${detection?.reason || ''}`
      );
    }
  }

  // Parse
  const parseResult = await parser.parse(fileContent);

  if (!parseResult.success) {
    throw new Error('Parse failed: ' + parseResult.errors.map((e) => e.message).join(', '));
  }

  // Calculate totals
  const totals = calculateTotals(parseResult.positions);

  // Determine snapshot date
  const resolvedSnapshotDate = getSnapshotDate(snapshotDate, originalFilename);

  // Create snapshot
  const snapshot: Omit<PortfolioSnapshot, '_id'> = {
    uploadId,
    userId,
    snapshotDate: resolvedSnapshotDate,
    positions: parseResult.positions,
    metadata: parseResult.metadata,
    ...totals,
    createdAt: new Date(),
  };

  // Save to database
  const snapshotId = await createSnapshot(snapshot);

  return {
    snapshotId,
    snapshot: { ...snapshot, _id: snapshotId },
    detection,
    parseResult,
  };
}

/**
 * Calculate totals from positions
 */
export function calculateTotals(positions: NormalizedPosition[]) {
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0);
  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return {
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPercentage,
  };
}

/**
 * Get timeline aggregation across all snapshots
 */
export async function getTimelineAggregation(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TimelineEntry[]> {
  // Get all snapshots for user in date range
  const snapshots = await getSnapshotsByUserId(userId, {
    startDate,
    endDate,
  });

  // Map to timeline entries
  const timeline: TimelineEntry[] = snapshots.map((snapshot) => ({
    date: snapshot.snapshotDate,
    totalValue: snapshot.totalValue,
    totalInvested: snapshot.totalInvested,
    gainLoss: snapshot.totalGainLoss,
    snapshotCount: 1,
  }));

  // Sort by date (oldest first)
  timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

  return timeline;
}

/**
 * Get position history for specific ISIN
 */
export async function getPositionHistory(userId: string, isin: string): Promise<PositionHistory> {
  // Get all snapshots containing this ISIN
  const snapshots = await getSnapshotsByPosition(userId, isin);

  const history = snapshots
    .map((s) => {
      const position = s.positions.find((p) => p.isin === isin);
      if (!position) return null;

      return {
        date: s.snapshotDate,
        quantity: position.quantity,
        price: position.currentPrice,
        value: position.currentValue,
        gainLoss: position.gainLoss,
      };
    })
    .filter((h) => h !== null) as PositionHistory['history'];

  // Get asset name from most recent position
  const latestSnapshot = snapshots[snapshots.length - 1];
  const latestPosition = latestSnapshot?.positions.find((p) => p.isin === isin);

  return {
    isin,
    assetName: latestPosition?.assetName || '',
    history,
  };
}
