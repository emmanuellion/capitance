import type { ISnapshotParser } from './ISnapshotParser.js';
import type { SnapshotFormatType } from '../../types/snapshot.types.js';
import type { FormatDetectionResult } from '../../types/parser.types.js';
import { FormatDetector } from './FormatDetector.js';

/**
 * Factory for creating and managing snapshot parsers
 */
export class ParserFactory {
  private parsers: Map<SnapshotFormatType, ISnapshotParser>;
  private detector: FormatDetector;

  constructor() {
    this.parsers = new Map();
    this.detector = new FormatDetector();
    this.registerDefaultParsers();
  }

  /**
   * Register default parsers
   * Note: Parsers are registered dynamically to avoid circular dependencies
   */
  private registerDefaultParsers(): void {
    // Parsers will be registered when they're imported
    // See BoursobankSnapshotParser.ts for auto-registration
  }

  /**
   * Register a parser
   */
  register(parser: ISnapshotParser): void {
    this.parsers.set(parser.formatType, parser);
  }

  /**
   * Get parser by format type
   */
  getParser(formatType: SnapshotFormatType): ISnapshotParser | null {
    return this.parsers.get(formatType) || null;
  }

  /**
   * Get all registered parsers
   */
  getAllParsers(): ISnapshotParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Auto-detect format and get appropriate parser
   */
  async detectAndGetParser(fileContent: string): Promise<{
    parser: ISnapshotParser | null;
    detection: FormatDetectionResult;
  }> {
    const detection = await this.detector.detect(fileContent, this.getAllParsers());

    if (detection.confidence > 0.7) {
      return {
        parser: this.getParser(detection.formatType),
        detection,
      };
    }

    return { parser: null, detection };
  }
}

// Global singleton instance
export const parserFactory = new ParserFactory();
