import Papa from 'papaparse';
import type { SnapshotFormatType } from '../../types/snapshot.types.js';
import type { ParseResult, ColumnMapping } from '../../types/parser.types.js';

/**
 * Interface for all snapshot parsers
 */
export interface ISnapshotParser {
  readonly formatType: SnapshotFormatType;
  readonly formatName: string;

  // Parse CSV content
  parse(fileContent: string): Promise<ParseResult>;

  // Validate if this parser can handle the file
  canParse(fileContent: string): boolean;

  // Get expected column headers
  getExpectedHeaders(): string[];

  // Get column mapping (for flexible parsing)
  getColumnMapping(): ColumnMapping;
}

/**
 * Base abstract class for common parser logic
 */
export abstract class BaseSnapshotParser implements ISnapshotParser {
  abstract readonly formatType: SnapshotFormatType;
  abstract readonly formatName: string;

  protected delimiter: string = ';';
  protected encoding: string = 'utf-8';

  abstract parse(fileContent: string): Promise<ParseResult>;
  abstract canParse(fileContent: string): boolean;
  abstract getExpectedHeaders(): string[];
  abstract getColumnMapping(): ColumnMapping;

  /**
   * Parse CSV content using PapaParse
   */
  protected parseCSV(content: string): any[] {
    const cleanContent = content.replace(/^\uFEFF/, ''); // Remove BOM

    const result = Papa.parse(cleanContent, {
      header: true,
      delimiter: this.delimiter,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().replace(/"/g, ''),
    });

    return result.data;
  }

  /**
   * Extract headers from CSV content
   */
  protected extractHeaders(content: string): string[] {
    const lines = content.split('\n');
    if (lines.length === 0) return [];

    const firstLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM
    return firstLine
      .split(this.delimiter)
      .map((h) => h.trim().replace(/"/g, ''));
  }

  /**
   * Validate if headers match expected headers
   */
  protected validateHeaders(headers: string[], expected: string[]): boolean {
    if (expected.length === 0) return false;

    const matches = expected.filter((exp) =>
      headers.some(
        (act) =>
          act.toLowerCase().includes(exp.toLowerCase()) ||
          exp.toLowerCase().includes(act.toLowerCase())
      )
    ).length;

    // At least 70% match
    return matches / expected.length >= 0.7;
  }
}
