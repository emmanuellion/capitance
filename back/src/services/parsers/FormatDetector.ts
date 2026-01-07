import type { ISnapshotParser } from './ISnapshotParser.js';
import type { FormatDetectionResult } from '../../types/parser.types.js';
import { SnapshotFormatType } from '../../types/snapshot.types.js';

/**
 * Detects the format of CSV files
 */
export class FormatDetector {
  /**
   * Detect the format of a CSV file
   */
  async detect(
    fileContent: string,
    availableParsers: ISnapshotParser[]
  ): Promise<FormatDetectionResult> {
    // Strategy: Check each parser's canParse() and score
    const results: Array<{
      parser: ISnapshotParser;
      score: number;
      reasons: string[];
    }> = [];

    for (const parser of availableParsers) {
      const score = this.scoreParser(fileContent, parser);
      if (score > 0) {
        results.push({
          parser,
          score,
          reasons: this.getDetectionReasons(fileContent, parser),
        });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    if (results.length === 0) {
      return {
        formatType: SnapshotFormatType.UNKNOWN,
        confidence: 0,
        reason: 'No matching format found',
        suggestedParser: '',
      };
    }

    const best = results[0];
    return {
      formatType: best.parser.formatType,
      confidence: best.score,
      reason: best.reasons.join(', '),
      suggestedParser: best.parser.formatName,
    };
  }

  /**
   * Score a parser based on how well it matches the content
   */
  private scoreParser(content: string, parser: ISnapshotParser): number {
    let score = 0;

    // Check header match (60% weight)
    const headers = this.extractHeaders(content);
    const expectedHeaders = parser.getExpectedHeaders();
    const headerMatch = this.calculateHeaderMatch(headers, expectedHeaders);
    score += headerMatch * 0.6;

    // Check canParse() (30% weight)
    if (parser.canParse(content)) {
      score += 0.3;
    }

    // Check sample data validity (10% weight)
    const sampleValid = this.validateSampleData(content, parser);
    score += sampleValid * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Extract headers from CSV content
   */
  private extractHeaders(content: string): string[] {
    const lines = content.split('\n');
    if (lines.length === 0) return [];

    // Parse first line as headers
    const firstLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM
    return firstLine.split(';').map((h) => h.trim().replace(/"/g, ''));
  }

  /**
   * Calculate how well headers match expected headers
   */
  private calculateHeaderMatch(actual: string[], expected: string[]): number {
    if (expected.length === 0) return 0;

    const matches = expected.filter((exp) =>
      actual.some(
        (act) =>
          act.toLowerCase().includes(exp.toLowerCase()) ||
          exp.toLowerCase().includes(act.toLowerCase())
      )
    ).length;

    return matches / expected.length;
  }

  /**
   * Validate sample data
   */
  private validateSampleData(content: string, parser: ISnapshotParser): number {
    try {
      const lines = content.split('\n').slice(0, 5);
      // Basic validation - if we can split and have multiple lines, it's valid
      return lines.length > 1 ? 1.0 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get human-readable detection reasons
   */
  private getDetectionReasons(content: string, parser: ISnapshotParser): string[] {
    const reasons: string[] = [];

    const headers = this.extractHeaders(content);
    const expectedHeaders = parser.getExpectedHeaders();
    const matches = headers.filter((h) =>
      expectedHeaders.some((exp) => exp.toLowerCase() === h.toLowerCase())
    );

    if (matches.length > 0) {
      reasons.push(`Matched ${matches.length}/${expectedHeaders.length} headers`);
    }

    if (parser.canParse(content)) {
      reasons.push('Parser validation passed');
    }

    return reasons;
  }
}
