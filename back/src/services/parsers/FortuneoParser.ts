import { BaseSnapshotParser } from './ISnapshotParser.js';
import { SnapshotFormatType } from '../../types/snapshot.types.js';
import type { NormalizedPosition } from '../../types/snapshot.types.js';
import type { ParseResult, ParseError, ParseWarning, ColumnMapping } from '../../types/parser.types.js';
import { parseFrenchNumber, parsePercentage } from '../../utils/numberUtils.js';
import { parserFactory } from './ParserFactory.js';
import { sanitizeCsvCell } from '../../utils/csvSecurity.js';

/**
 * Parser for Fortuneo snapshot CSV files
 * Format typique: Libellé;Code ISIN;Quantité;PRU;Cours;Valorisation;+/- Value latente;% +/- Value
 *
 * Note: Si votre fichier Fortuneo a un format différent, ajustez les colonnes dans expectedHeaders
 */
export class FortuneoParser extends BaseSnapshotParser {
  readonly formatType = SnapshotFormatType.FORTUNEO_SNAPSHOT;
  readonly formatName = 'Fortuneo Position Snapshot';

  private readonly expectedHeaders = [
    'libelle',
    'codeisin',
    'quantite',
    'pru',
    'cours',
    'valorisation',
    'valuelatente',
    'valuepercentage',
  ];

  getExpectedHeaders(): string[] {
    return this.expectedHeaders;
  }

  canParse(fileContent: string): boolean {
    const lines = fileContent.split('\n');
    if (lines.length < 2) return false;

    const firstLine = lines[0].replace(/^\uFEFF/, '').toLowerCase();

    // Check for Fortuneo-specific headers
    // Fortuneo typically uses "code isin" or "isin" and "libellé" or "libelle"
    const hasLibelle = firstLine.includes('libelle') || firstLine.includes('libellé');
    const hasCodeIsin = firstLine.includes('code isin') || firstLine.includes('codeisin') || firstLine.includes('isin');
    const hasPru = firstLine.includes('pru');
    const hasValorisation = firstLine.includes('valorisation');

    return hasLibelle && hasCodeIsin && hasPru && hasValorisation;
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
          const isinField = row.codeisin || row.isin || row['code isin'] || row['Code ISIN'];
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
          bankName: 'Fortuneo',
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
          bankName: 'Fortuneo',
        },
      };
    }
  }

  /**
   * Parse a single row into NormalizedPosition
   */
  private parseRow(row: any): NormalizedPosition {
    // Get ISIN from various possible column names
    const isin = row.codeisin || row.isin || row['code isin'] || row['Code ISIN'];

    // Get other fields with flexible column names
    const libelle = row.libelle || row.libellé || row['Libellé'] || row.name;
    const quantite = row.quantite || row.quantité || row['Quantité'] || row.quantity;
    const pru = row.pru || row.PRU;
    const cours = row.cours || row.Cours || row.price || row.currentprice;
    const valorisation = row.valorisation || row.Valorisation || row.valeur || row.value;
    const valueLatente = row.valuelatente || row['value latente'] || row['+/- value latente'] || row['plusmoinsvalue'];
    const valuePercentage = row.valuepercentage || row['% +/- value'] || row.performance || row['%performance'];

    // Parse values
    const quantity = parseFrenchNumber(quantite);
    const averageBuyingPrice = parseFrenchNumber(pru);
    const currentPrice = parseFrenchNumber(cours);
    const currentValue = parseFrenchNumber(valorisation);
    const gainLoss = parseFrenchNumber(valueLatente);
    const gainLossPercentage = parsePercentage(valuePercentage);

    // Calculate total invested
    const totalInvested = quantity * averageBuyingPrice;

    return {
      isin: sanitizeCsvCell(isin?.trim()),
      assetName: sanitizeCsvCell(libelle?.trim().replace(/"/g, '')),
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
      isin: 'codeisin',
      assetName: 'libelle',
      quantity: 'quantite',
      currentPrice: 'cours',
      buyingPrice: 'pru',
    };
  }
}

// Auto-register this parser
parserFactory.register(new FortuneoParser());
