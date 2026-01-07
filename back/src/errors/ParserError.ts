import { AppError } from './AppError.js';

export interface ParseErrorDetail {
  line?: number;
  field?: string;
  message: string;
}

/**
 * Error thrown when CSV parsing fails
 * Includes detailed parsing errors for debugging
 */
export class ParserError extends AppError {
  public readonly parseErrors: ParseErrorDetail[];

  constructor(message: string, parseErrors: ParseErrorDetail[] = []) {
    super(message, 422); // 422 Unprocessable Entity
    this.parseErrors = parseErrors;
    Object.setPrototypeOf(this, ParserError.prototype);
  }
}
