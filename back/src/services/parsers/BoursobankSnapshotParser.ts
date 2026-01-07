import { BaseSnapshotParser } from './ISnapshotParser.js';
import { SnapshotFormatType } from '../../types/snapshot.types.js';
import type { NormalizedPosition } from '../../types/snapshot.types.js';
import type { ParseResult, ParseError, ParseWarning, ColumnMapping } from '../../types/parser.types.js';
import { parseFrenchNumber, parsePercentage } from '../../utils/numberUtils.js';
import { parserFactory } from './ParserFactory.js';

/**
 * Parser for Boursobank snapshot CSV files
 * Format: name;isin;quantity;buyingPrice;lastPrice;intradayVariation;amount;amountVariation;variation
 */
export class BoursobankSnapshotParser extends BaseSnapshotParser {
  readonly formatType = SnapshotFormatType.BOURSOBANK_SNAPSHOT;
  readonly formatName = 'Boursobank Position Snapshot';

  private readonly expectedHeaders = [
    'name',
    'isin',
    'quantity',
    'buyingPrice',
    'lastPrice',
    'intradayVariation',
    'amount',
    'amountVariation',
    'variation',
  ];

  getExpectedHeaders(): string[] {
    return this.expectedHeaders;
  }

  canParse(fileContent: string): boolean {
    const lines = fileContent.split('\n');
    if (lines.length < 2) return false;

    const firstLine = lines[0].replace(/^\uFEFF/, '').toLowerCase();

    // Must have these key headers
    return (
      firstLine.includes('isin') &&
      firstLine.includes('buyingprice') &&
      firstLine.includes('lastprice') &&
      firstLine.includes('quantity')
    );
  }

  async parse(fileContent: string): Promise<ParseResult> {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    const positions: NormalizedPosition[] = [];

    try {
      // Parse CSV
      const rows = this.parseCSV(fileContent);

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row: any = rows[i];

        try {
          // Skip rows without ISIN
          if (!row.isin || row.isin.trim() === '') {
            warnings.push({
              row: i + 2,
              message: 'Row skipped: missing ISIN',
            });
            continue;
          }

          const position = this.parseRow(row);
          positions.push(position);
        } catch (error) {
          errors.push({
            row: i + 2, // +2 for 1-indexed and header
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: 'error',
          });
        }
      }

      return {
        success: errors.length === 0,
        positions,
        errors,
        warnings,
        metadata: {
          formatType: this.formatType,
          bankName: 'Boursobank',
          parseWarnings: warnings.map((w) => w.message),
        },
      };
    } catch (error) {
      return {
        success: false,
        positions: [],
        errors: [
          {
            message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
          },
        ],
        metadata: {
          formatType: this.formatType,
          bankName: 'Boursobank',
        },
      };
    }
  }

  /**
   * Parse a single row into NormalizedPosition
   */
  private parseRow(row: any): NormalizedPosition {
    // Parse values
    const quantity = parseFrenchNumber(row.quantity);
    const buyingPrice = parseFrenchNumber(row.buyingPrice);
    const lastPrice = parseFrenchNumber(row.lastPrice);
    const amount = parseFrenchNumber(row.amount);
    const amountVariation = parseFrenchNumber(row.amountVariation);
    const variation = parsePercentage(row.variation);
    const intradayVariation = parsePercentage(row.intradayVariation);

    // Calculate derived values
    const totalInvested = quantity * buyingPrice;
    const currentValue = amount; // Boursobank provides this directly
    const gainLoss = amountVariation; // Boursobank provides this directly
    const gainLossPercentage = variation; // Boursobank provides this as percentage

    return {
      isin: row.isin?.trim() || '',
      assetName: row.name?.trim().replace(/"/g, '') || '',
      quantity,
      currentPrice: lastPrice,
      currentValue,
      averageBuyingPrice: buyingPrice,
      totalInvested,
      gainLoss,
      gainLossPercentage,
      intradayVariation,
      intradayVariationPercentage: intradayVariation,
      currency: 'EUR',
    };
  }

  getColumnMapping(): ColumnMapping {
    return {
      isin: 'isin',
      assetName: 'name',
      quantity: 'quantity',
      currentPrice: 'lastPrice',
      buyingPrice: 'buyingPrice',
    };
  }
}

// Auto-register this parser
parserFactory.register(new BoursobankSnapshotParser());
