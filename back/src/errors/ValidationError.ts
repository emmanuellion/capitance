import { AppError } from './AppError.js';

/**
 * Error thrown when request validation fails
 * Includes field-specific error messages
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400);
    this.fields = fields;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
