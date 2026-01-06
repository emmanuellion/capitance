import { type Request, type Response, type NextFunction } from 'express';

interface ErrorWithStatus extends Error {
    status?: number;
}

export const errorHandler = (
    err: ErrorWithStatus,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    console.error(`[Error] ${status} - ${message}`);
    console.error(err.stack);

    res.status(status).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
};
