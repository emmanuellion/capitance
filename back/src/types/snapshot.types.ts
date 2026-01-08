import type { ObjectId } from 'mongodb';

// Supported snapshot formats
export enum SnapshotFormatType {
  BOURSOBANK_SNAPSHOT = 'boursobank_snapshot',
  FORTUNEO_SNAPSHOT = 'fortuneo_snapshot',
  BOURSE_DIRECT_SNAPSHOT = 'bourse_direct_snapshot',
  DEGIRO_POSITIONS = 'degiro_positions',
  TRADE_REPUBLIC_SNAPSHOT = 'trade_republic_snapshot',
  INTERACTIVE_BROKERS_SNAPSHOT = 'interactive_brokers_snapshot',
  GENERIC_CSV = 'generic_csv',
  UNKNOWN = 'unknown',
}

// Unified position structure - normalized across all formats
export interface NormalizedPosition {
  isin: string;
  assetName: string;
  quantity: number;

  // Current market data
  currentPrice: number;
  currentValue: number;

  // Cost basis
  averageBuyingPrice: number; // PRU equivalent
  totalInvested: number;

  // Performance
  gainLoss: number;
  gainLossPercentage: number;
  intradayVariation?: number; // Optional - only for some formats
  intradayVariationPercentage?: number;

  // Metadata
  currency?: string;
  exchange?: string;
  symbol?: string; // Ticker symbol for API lookups (e.g., "AAPL", "MSFT")
  symbolSource?: 'broker_data' | 'asset_name_extraction' | 'manual' | 'api_resolution'; // How the symbol was obtained
}

// Snapshot metadata
export interface SnapshotMetadata {
  formatType: SnapshotFormatType;
  bankName: string;
  detectionConfidence?: number; // For auto-detection
  parseWarnings?: string[];
  customFields?: Record<string, any>; // Format-specific extras
}

// Complete snapshot
export interface PortfolioSnapshot {
  _id?: ObjectId;
  uploadId: ObjectId;
  userId: string;

  snapshotDate: Date; // When the snapshot was taken (from file or upload)
  positions: NormalizedPosition[];
  metadata: SnapshotMetadata;

  // Aggregated totals
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;

  createdAt: Date; // When uploaded to system
  updatedAt?: Date;
}

// Timeline aggregation for historical view
export interface TimelineEntry {
  date: Date;
  totalValue: number;
  totalInvested: number;
  gainLoss: number;
  snapshotCount: number;
}

// Position history for specific ISIN
export interface PositionHistory {
  isin: string;
  assetName: string;
  history: Array<{
    date: Date;
    quantity: number;
    price: number;
    value: number;
    gainLoss: number;
  }>;
}
