import { AppError } from './AppError.js';

/**
 * Error thrown when authentication fails
 * Used for login failures, invalid tokens, etc.
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}
