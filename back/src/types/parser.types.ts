import type { NormalizedPosition, SnapshotFormatType, SnapshotMetadata } from './snapshot.types.js';

// Parser input/output
export interface ParseResult {
  success: boolean;
  positions: NormalizedPosition[];
  errors: ParseError[];
  warnings?: ParseWarning[];
  metadata: SnapshotMetadata;
  rawData?: any; // For debugging
}

export interface ParseError {
  row?: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParseWarning {
  row?: number;
  message: string;
}

// Format detection
export interface FormatDetectionResult {
  formatType: SnapshotFormatType;
  confidence: number; // 0-1
  reason: string;
  suggestedParser: string;
}

// Column mapping for flexible parsing
export interface ColumnMapping {
  isin: string | string[]; // Column name(s) for ISIN
  assetName: string | string[];
  quantity: string | string[];
  currentPrice: string | string[];
  buyingPrice: string | string[];
  // Additional mappings as needed
}
