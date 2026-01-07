import Papa from 'papaparse';
import { BaseSnapshotParser } from './ISnapshotParser.js';
import type { NormalizedPosition, SnapshotFormatType } from '../../types/snapshot.types.js';
import type { ParseResult, ParseError, ColumnMapping } from '../../types/parser.types.js';
import { parseGermanNumber, parsePercentage } from '../../utils/numberUtils.js';
import { parserFactory } from './ParserFactory.js';
import { sanitizeCsvCell } from '../../utils/csvSecurity.js';

/**
 * Parser for Trade Republic portfolio CSV exports
 *
 * Expected format:
 * - German number format (1.234,56)
 * - Headers: name, isin, shares, averageBuyInPrice, currentPrice, totalValue, profitLoss, profitLossPercent
 * - Currency: EUR
 */
export class TradeRepublicParser extends BaseSnapshotParser {
    readonly formatType = 'trade_republic_snapshot' as SnapshotFormatType;
    readonly formatName = 'Trade Republic Portfolio';

    private readonly expectedHeaders = [
        'name', 'isin', 'shares', 'averageBuyinprice',
        'currentprice', 'totalvalue', 'profitloss', 'profitlosspercent'
    ];

    getExpectedHeaders(): string[] {
        return this.expectedHeaders;
    }

    getColumnMapping(): ColumnMapping {
        return {
            isin: 'isin',
            assetName: 'name',
            quantity: 'shares',
            currentPrice: 'currentprice',
            buyingPrice: 'averageBuyinprice',
        };
    }

    canParse(fileContent: string): boolean {
        try {
            const firstLine = fileContent.split('\n')[0];
            if (!firstLine) return false;

            const normalizedHeaders = firstLine.toLowerCase().replace(/\s/g, '');

            // Trade Republic specific: must have "averagebuyin" and "shares" headers
            const hasAverageBuyIn = normalizedHeaders.includes('averagebuyin');
            const hasShares = normalizedHeaders.includes('shares');
            const hasISIN = normalizedHeaders.includes('isin');

            return hasAverageBuyIn && hasShares && hasISIN;
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
                transformHeader: (header: string) => header.toLowerCase().trim().replace(/\s/g, ''),
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
                    // Skip rows without ISIN
                    if (!row.isin || row.isin.trim() === '') {
                        continue;
                    }

                    const position = this.parseRow(row);

                    // Validation
                    if (position.quantity <= 0) {
                        errors.push({
                            row: i + 2,
                            field: 'shares',
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
                        bankName: 'Trade Republic',
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
                    bankName: 'Trade Republic',
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
                    bankName: 'Trade Republic',
                    detectionConfidence: 0.3,
                },
            };
        }
    }

    private parseRow(row: any): NormalizedPosition {
        const quantity = parseGermanNumber(row.shares);
        const buyingPrice = parseGermanNumber(row.averageBuyinprice || row.averagebuyin);
        const currentPrice = parseGermanNumber(row.currentprice);
        const totalValue = parseGermanNumber(row.totalvalue);
        const profitLoss = parseGermanNumber(row.profitloss);
        const profitLossPercent = parsePercentage(row.profitlosspercent);

        const totalInvested = quantity * buyingPrice;

        return {
            isin: sanitizeCsvCell(row.isin.trim()),
            assetName: sanitizeCsvCell(row.name.trim()),
            quantity,
            currentPrice,
            currentValue: totalValue,
            averageBuyingPrice: buyingPrice,
            totalInvested,
            gainLoss: profitLoss,
            gainLossPercentage: profitLossPercent,
            currency: 'EUR',
        };
    }
}

// Auto-register this parser
parserFactory.register(new TradeRepublicParser());
