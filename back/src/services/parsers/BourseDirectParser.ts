import { BaseSnapshotParser } from './ISnapshotParser.js';
import { SnapshotFormatType } from '../../types/snapshot.types.js';
import type { NormalizedPosition } from '../../types/snapshot.types.js';
import type { ParseResult, ParseError, ParseWarning, ColumnMapping } from '../../types/parser.types.js';
import { parseFrenchNumber, parsePercentage } from '../../utils/numberUtils.js';
import { parserFactory } from './ParserFactory.js';
import { sanitizeCsvCell } from '../../utils/csvSecurity.js';

/**
 * Parser for Bourse Direct snapshot CSV files
 * Format typique: Valeur;ISIN;Qté;PRU;Cours;Valorisation;+/- value;Perf %
 *
 * Note: Si votre fichier Bourse Direct a un format différent, ajustez les colonnes dans expectedHeaders
 */
export class BourseDirectParser extends BaseSnapshotParser {
  readonly formatType = SnapshotFormatType.BOURSE_DIRECT_SNAPSHOT;
  readonly formatName = 'Bourse Direct Position Snapshot';

  private readonly expectedHeaders = [
    'valeur',
    'isin',
    'qte',
    'pru',
    'cours',
    'valorisation',
    'plusmoinsvalue',
    'perf',
  ];

  getExpectedHeaders(): string[] {
    return this.expectedHeaders;
  }

  canParse(fileContent: string): boolean {
    const lines = fileContent.split('\n');
    if (lines.length < 2) return false;

    const firstLine = lines[0].replace(/^\uFEFF/, '').toLowerCase();

    // Check for Bourse Direct-specific headers
    // Bourse Direct typically uses "Valeur", "ISIN", "Qté", "PRU", "Cours"
    const hasValeur = firstLine.includes('valeur');
    const hasIsin = firstLine.includes('isin');
    const hasPru = firstLine.includes('pru');
    const hasQte = firstLine.includes('qté') || firstLine.includes('qte') || firstLine.includes('quantite');
    const hasCours = firstLine.includes('cours');

    return hasValeur && hasIsin && hasPru && hasQte && hasCours;
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
          const isinField = row.isin || row.ISIN || row['Code ISIN'];
          if (!isinField || isinField.trim() === '') {
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
            row: i + 2,
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
          bankName: 'Bourse Direct',
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
          bankName: 'Bourse Direct',
        },
      };
    }
  }

  /**
   * Parse a single row into NormalizedPosition
   */
  private parseRow(row: any): NormalizedPosition {
    // Get fields with flexible column names
    const isin = row.isin || row.ISIN || row['Code ISIN'];
    const valeur = row.valeur || row.Valeur || row.libelle || row.name;
    const qte = row.qte || row.qté || row['Qté'] || row.quantite || row.quantity;
    const pru = row.pru || row.PRU;
    const cours = row.cours || row.Cours || row.price || row.currentprice;
    const valorisation = row.valorisation || row.Valorisation || row.valeur || row.value;
    const plusMoinsValue = row.plusmoinsvalue || row['+/- value'] || row['+/-value'] || row.gainloss;
    const perf = row.perf || row['perf %'] || row['Perf %'] || row.performance || row['performance %'];

    // Parse values
    const quantity = parseFrenchNumber(qte);
    const averageBuyingPrice = parseFrenchNumber(pru);
    const currentPrice = parseFrenchNumber(cours);
    const currentValue = parseFrenchNumber(valorisation);
    const gainLoss = parseFrenchNumber(plusMoinsValue);
    const gainLossPercentage = parsePercentage(perf);

    // Calculate total invested
    const totalInvested = quantity * averageBuyingPrice;

    return {
      isin: sanitizeCsvCell(isin?.trim()),
      assetName: sanitizeCsvCell(valeur?.trim().replace(/"/g, '')),
      quantity,
      currentPrice,
      currentValue,
      averageBuyingPrice,
      totalInvested,
      gainLoss,
      gainLossPercentage,
      currency: 'EUR',
    };
  }

  getColumnMapping(): ColumnMapping {
    return {
      isin: 'isin',
      assetName: 'valeur',
      quantity: 'qte',
      currentPrice: 'cours',
      buyingPrice: 'pru',
    };
  }
}

// Auto-register this parser
parserFactory.register(new BourseDirectParser());
