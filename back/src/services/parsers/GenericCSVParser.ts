import Papa from 'papaparse';
import { BaseSnapshotParser } from './ISnapshotParser.js';
import type { NormalizedPosition, SnapshotFormatType } from '../../types/snapshot.types.js';
import type { ParseResult, ParseError, ColumnMapping as BaseColumnMapping } from '../../types/parser.types.js';
import { parseFrenchNumber, parsePercentage } from '../../utils/numberUtils.js';
import { parserFactory } from './ParserFactory.js';
import { sanitizeCsvCell } from '../../utils/csvSecurity.js';

interface ExtendedColumnMapping {
    isin: string;
    assetName: string;
    quantity: string;
    currentPrice: string;
    buyingPrice: string;
    currentValue?: string;
    totalInvested?: string;
    gainLoss?: string;
    gainLossPercentage?: string;
    currency?: string;
}

/**
 * Generic CSV parser with heuristic column detection
 *
 * Attempts to automatically detect column meanings based on header names
 * Falls back parser when specific bank formats are not recognized
 */
export class GenericCSVParser extends BaseSnapshotParser {
    readonly formatType = 'generic_csv' as SnapshotFormatType;
    readonly formatName = 'Generic CSV';

    private extendedColumnMapping: ExtendedColumnMapping | null = null;

    getExpectedHeaders(): string[] {
        return ['identifier', 'name', 'quantity', 'price'];
    }

    getColumnMapping(): BaseColumnMapping {
        return {
            isin: this.extendedColumnMapping?.isin || 'isin',
            assetName: this.extendedColumnMapping?.assetName || 'name',
            quantity: this.extendedColumnMapping?.quantity || 'quantity',
            currentPrice: this.extendedColumnMapping?.currentPrice || 'price',
            buyingPrice: this.extendedColumnMapping?.buyingPrice || 'buyingPrice',
        };
    }

    canParse(fileContent: string): boolean {
        try {
            const headers = this.extractHeaders(fileContent);
            if (headers.length === 0) return false;

            // Must have at minimum: identifier + quantity + (price OR value)
            const hasIdentifier = this.findColumn(headers, /isin|symbol|ticker|code|id/i) !== null;
            const hasQuantity = this.findColumn(headers, /quantity|shares|qty|amount|nombre/i) !== null;
            const hasPrice = this.findColumn(headers, /price|cours|value|valeur|total/i) !== null;

            return hasIdentifier && hasQuantity && hasPrice;
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
            if (rows.length === 0) {
                return {
                    success: false,
                    positions: [],
                    errors: [{
                        row: 0,
                        field: 'file',
                        message: 'No data rows found',
                        severity: 'error',
                    }],
                    metadata: {
                        formatType: this.formatType,
                        bankName: 'Generic',
                        detectionConfidence: 0.3,
                    },
                };
            }

            // Auto-detect column mapping from first row
            const headers = Object.keys(rows[0]);
            this.extendedColumnMapping = this.detectColumnMapping(headers);

            // Validate required columns
            if (!this.extendedColumnMapping.isin || !this.extendedColumnMapping.quantity) {
                return {
                    success: false,
                    positions: [],
                    errors: [{
                        row: 0,
                        field: 'headers',
                        message: 'Could not detect required columns (identifier, quantity)',
                        severity: 'error',
                    }],
                    metadata: {
                        formatType: this.formatType,
                        bankName: 'Generic',
                        detectionConfidence: 0.4,
                        parseWarnings: ['Missing required columns'],
                    },
                };
            }

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                try {
                    const position = this.parseRow(row);

                    // Skip invalid positions
                    if (!position.isin || position.quantity <= 0) {
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

            if (positions.length === 0) {
                return {
                    success: false,
                    positions: [],
                    errors,
                    metadata: {
                        formatType: this.formatType,
                        bankName: 'Generic',
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
                    bankName: 'Generic',
                    detectionConfidence: 0.7,
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
                    bankName: 'Generic',
                    detectionConfidence: 0.3,
                },
            };
        }
    }

    protected extractHeaders(fileContent: string): string[] {
        const firstLine = fileContent.split('\n')[0];
        if (!firstLine) return [];

        // Try comma, semicolon, tab separators
        const separators = [',', ';', '\t'];
        for (const sep of separators) {
            const headers = firstLine.split(sep).map(h => h.trim());
            if (headers.length > 1) {
                return headers;
            }
        }

        return [];
    }

    private findColumn(headers: string[], pattern: RegExp): string | null {
        const found = headers.find(h => pattern.test(h));
        return found || null;
    }

    private detectColumnMapping(headers: string[]): ExtendedColumnMapping {
        return {
            isin: this.findColumn(headers, /isin|symbol|ticker|code|id/i) || '',
            assetName: this.findColumn(headers, /name|description|titre|libelle|asset/i) || '',
            quantity: this.findColumn(headers, /quantity|shares|qty|amount|nombre|titres/i) || '',
            currentPrice: this.findColumn(headers, /current.*price|cours|price|prix/i) || '',
            currentValue: this.findColumn(headers, /current.*value|market.*value|valeur.*actuelle|total.*value|valeur/i) || undefined,
            buyingPrice: this.findColumn(headers, /buying.*price|purchase.*price|average.*price|pru|prix.*achat|prix.*moyen/i) || '',
            totalInvested: this.findColumn(headers, /invested|cost.*basis|montant.*investi|total.*investi/i) || undefined,
            gainLoss: this.findColumn(headers, /gain|loss|profit|perte|plus.*value|moins.*value/i) || undefined,
            gainLossPercentage: this.findColumn(headers, /gain.*%|loss.*%|profit.*%|performance.*%/i) || undefined,
            currency: this.findColumn(headers, /currency|devise|monnaie/i) || undefined,
        };
    }

    private parseRow(row: any): NormalizedPosition {
        if (!this.extendedColumnMapping) {
            throw new Error('Column mapping not initialized');
        }

        const isin = sanitizeCsvCell(this.extendedColumnMapping.isin ? row[this.extendedColumnMapping.isin]?.toString().trim() : '');
        const assetName = sanitizeCsvCell(this.extendedColumnMapping.assetName ? row[this.extendedColumnMapping.assetName]?.toString().trim() : isin);
        const quantity = this.extendedColumnMapping.quantity ? parseFrenchNumber(row[this.extendedColumnMapping.quantity]) : 0;
        const currency = sanitizeCsvCell(this.extendedColumnMapping.currency ? row[this.extendedColumnMapping.currency]?.toString().trim() : 'EUR');

        // Try to get current price and value
        let currentPrice = 0;
        let currentValue = 0;

        if (this.extendedColumnMapping.currentPrice) {
            currentPrice = parseFrenchNumber(row[this.extendedColumnMapping.currentPrice]);
        }

        if (this.extendedColumnMapping.currentValue) {
            currentValue = parseFrenchNumber(row[this.extendedColumnMapping.currentValue]);
        }

        // Calculate missing value: if we have quantity and price but not value
        if (currentValue === 0 && currentPrice > 0 && quantity > 0) {
            currentValue = currentPrice * quantity;
        }

        // Calculate missing price: if we have quantity and value but not price
        if (currentPrice === 0 && currentValue > 0 && quantity > 0) {
            currentPrice = currentValue / quantity;
        }

        // Try to get buying price and total invested
        let buyingPrice = 0;
        let totalInvested = 0;

        if (this.extendedColumnMapping.buyingPrice) {
            buyingPrice = parseFrenchNumber(row[this.extendedColumnMapping.buyingPrice]);
        }

        if (this.extendedColumnMapping.totalInvested) {
            totalInvested = parseFrenchNumber(row[this.extendedColumnMapping.totalInvested]);
        }

        // Calculate missing values
        if (totalInvested === 0 && buyingPrice > 0 && quantity > 0) {
            totalInvested = buyingPrice * quantity;
        }

        if (buyingPrice === 0 && totalInvested > 0 && quantity > 0) {
            buyingPrice = totalInvested / quantity;
        }

        // Try to get gain/loss
        let gainLoss = 0;
        let gainLossPercentage = 0;

        if (this.extendedColumnMapping.gainLoss) {
            gainLoss = parseFrenchNumber(row[this.extendedColumnMapping.gainLoss]);
        }

        if (this.extendedColumnMapping.gainLossPercentage) {
            gainLossPercentage = parsePercentage(row[this.extendedColumnMapping.gainLossPercentage]);
        }

        // Calculate missing gain/loss
        if (gainLoss === 0 && currentValue > 0 && totalInvested > 0) {
            gainLoss = currentValue - totalInvested;
        }

        if (gainLossPercentage === 0 && totalInvested > 0 && gainLoss !== 0) {
            gainLossPercentage = (gainLoss / totalInvested) * 100;
        }

        return {
            isin,
            assetName,
            quantity,
            currentPrice,
            currentValue,
            averageBuyingPrice: buyingPrice,
            totalInvested,
            gainLoss,
            gainLossPercentage,
            currency,
        };
    }
}

// Auto-register this parser
parserFactory.register(new GenericCSVParser());
