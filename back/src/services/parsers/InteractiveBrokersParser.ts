import Papa from 'papaparse';
import { BaseSnapshotParser } from './ISnapshotParser.js';
import type { NormalizedPosition, SnapshotFormatType } from '../../types/snapshot.types.js';
import type { ParseResult, ParseError, ColumnMapping } from '../../types/parser.types.js';
import { parserFactory } from './ParserFactory.js';
import { sanitizeCsvCell } from '../../utils/csvSecurity.js';

/**
 * Parser for Interactive Brokers portfolio CSV exports
 *
 * Expected format:
 * - US number format (1,234.56)
 * - Headers: Symbol, Description, Quantity, Cost Basis, Market Price, Market Value, Unrealized P&L, Currency
 * - Multi-currency support
 */
export class InteractiveBrokersParser extends BaseSnapshotParser {
    readonly formatType = 'interactive_brokers_snapshot' as SnapshotFormatType;
    readonly formatName = 'Interactive Brokers Portfolio';

    private readonly expectedHeaders = [
        'symbol', 'description', 'quantity', 'costbasis',
        'marketprice', 'marketvalue', 'unrealizedp&l', 'currency'
    ];

    getExpectedHeaders(): string[] {
        return this.expectedHeaders;
    }

    getColumnMapping(): ColumnMapping {
        return {
            isin: 'symbol',
            assetName: 'description',
            quantity: 'quantity',
            currentPrice: 'marketprice',
            buyingPrice: 'costbasis',
        };
    }

    canParse(fileContent: string): boolean {
        try {
            const firstLine = fileContent.split('\n')[0];
            if (!firstLine) return false;

            const normalizedHeaders = firstLine.toLowerCase().replace(/\s/g, '').replace(/&/g, '');

            // Interactive Brokers specific: must have "costbasis" and "marketvalue" headers
            const hasCostBasis = normalizedHeaders.includes('costbasis');
            const hasMarketValue = normalizedHeaders.includes('marketvalue');
            const hasSymbol = normalizedHeaders.includes('symbol');

            return hasCostBasis && hasMarketValue && hasSymbol;
        } catch (error) {
            return false;
        }
    }

    async parse(fileContent: string): Promise<ParseResult> {
        const errors: ParseError[] = [];
        const positions: NormalizedPosition[] = [];

        try {
            const parseResult = Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header: string) => header.toLowerCase().trim().replace(/\s/g, '').replace(/&/g, ''),
            });

            if (parseResult.errors.length > 0) {
                parseResult.errors.forEach(err => {
                    errors.push({
                        row: err.row !== undefined ? err.row + 2 : 0,
                        field: err.code || 'unknown',
                        message: err.message,
                        severity: 'error',
                    });
                });
            }

            const rows = parseResult.data as any[];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                try {
                    // Skip rows without symbol
                    if (!row.symbol || row.symbol.trim() === '') {
                        continue;
                    }

                    const position = this.parseRow(row);

                    // Validation
                    if (position.quantity <= 0) {
                        errors.push({
                            row: i + 2,
                            field: 'quantity',
                            message: `Invalid quantity: ${position.quantity}`,
                            severity: 'error',
                        });
                        continue;
                    }

                    positions.push(position);
                } catch (error) {
                    errors.push({
                        row: i + 2,
                        field: 'row',
                        message: error instanceof Error ? error.message : 'Failed to parse row',
                        severity: 'error',
                    });
                }
            }

            if (positions.length === 0 && errors.length > 0) {
                return {
                    success: false,
                    positions: [],
                    errors,
                    metadata: {
                        formatType: this.formatType,
                        bankName: 'Interactive Brokers',
                        detectionConfidence: 0.5,
                        parseWarnings: ['No valid positions found'],
                    },
                };
            }

            return {
                success: errors.length === 0,
                positions,
                errors,
                metadata: {
                    formatType: this.formatType,
                    bankName: 'Interactive Brokers',
                    detectionConfidence: 0.95,
                    parseWarnings: errors.length > 0 ? [`${errors.length} errors encountered`] : undefined,
                },
            };
        } catch (error) {
            return {
                success: false,
                positions: [],
                errors: [{
                    row: 0,
                    field: 'file',
                    message: error instanceof Error ? error.message : 'Failed to parse file',
                    severity: 'error',
                }],
                metadata: {
                    formatType: this.formatType,
                    bankName: 'Interactive Brokers',
                    detectionConfidence: 0.3,
                },
            };
        }
    }

    private parseRow(row: any): NormalizedPosition {
        // IB uses US number format with commas for thousands
        const parseUSNumber = (value: string | number): number => {
            if (typeof value === 'number') return value;
            if (!value) return 0;

            const cleaned = value.toString().replace(/,/g, '').replace(/\$/g, '').trim();
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        };

        const currency = row.currency || 'USD';
        const quantity = parseUSNumber(row.quantity);
        const costBasis = parseUSNumber(row.costbasis);
        const marketPrice = parseUSNumber(row.marketprice);
        const marketValue = parseUSNumber(row.marketvalue);
        const unrealizedPL = parseUSNumber(row.unrealizedpl || row['unrealizedp&l'] || row.unrealizedpandl);

        const buyingPrice = quantity > 0 ? costBasis / quantity : 0;
        const gainLossPercentage = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

        return {
            isin: sanitizeCsvCell(row.symbol.trim()), // IB uses Symbol instead of ISIN
            assetName: sanitizeCsvCell(row.description?.trim() || row.symbol.trim()),
            quantity,
            currentPrice: marketPrice,
            currentValue: marketValue,
            averageBuyingPrice: buyingPrice,
            totalInvested: costBasis,
            gainLoss: unrealizedPL,
            gainLossPercentage,
            currency,
        };
    }
}

// Auto-register this parser
parserFactory.register(new InteractiveBrokersParser());
