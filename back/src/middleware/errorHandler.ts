import { type Request, type Response, type NextFunction } from 'express';
import logger from '../utils/logger.js';
import { AppError, ValidationError, ParserError } from '../errors/index.js';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Handle AppError and its subclasses
    if (err instanceof AppError) {
        // Operational error - log as warning
        logger.warn('Operational error', {
            status: err.statusCode,
            message: err.message,
            method: req.method,
            path: req.path,
            ...(err instanceof ValidationError && err.fields && { fields: err.fields }),
            ...(err instanceof ParserError && err.parseErrors.length > 0 && { parseErrors: err.parseErrors }),
        });

        // Build response
        const response: any = {
            success: false,
            error: {
                message: err.message,
            },
        };

        // Add type-specific details
        if (err instanceof ValidationError && err.fields) {
            response.error.fields = err.fields;
        }

        if (err instanceof ParserError && err.parseErrors.length > 0) {
            response.error.parseErrors = err.parseErrors;
        }

        // Add stack trace in development
        if (process.env.NODE_ENV === 'development') {
            response.error.stack = err.stack;
        }

        res.status(err.statusCode).json(response);
        return;
    }

    // Programmer error - log full details
    logger.error('Unhandled error', {
        error: err,
        message: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
    });

    // Don't expose internal error details in production
    res.status(500).json({
        success: false,
        error: {
            message: process.env.NODE_ENV === 'development'
                ? err.message
                : 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
};
