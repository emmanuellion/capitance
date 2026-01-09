import { getPortfolio as binanceGetPortfolio, clearCache as binanceClearCache } from './binancePortfolioService.js';
import { getBinanceCredentials } from '../models/User.js';
import { cacheService } from './cacheService.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

// ==================== Types ====================

export interface BinanceAsset {
    asset: string;
    quantityNow: number;
    priceUSDT: number | null;
    valueUSDT: number | null;
    valueEUR: number | null;
    tradeQtyBasis: number;
    tradeCostUSDT: number;
    avgCostUSDT: number | null;
    pnlUSDT: number | null;
    pnlEUR: number | null;
    depositQtyObserved: number;
    note: string;
}

export interface BinancePnL {
    assets: BinanceAsset[];
    pnlTotals: {
        pnlUSDT: number;
        pnlEUR: number | null;
    };
    warnings?: any[];
}

export interface BinancePortfolioData {
    ok: boolean;
    totals: {
        usdt: number;
        eur: number | null;
        usdtToEurRate: number | null;
    };
    assets: BinanceAsset[];
    pnl: BinancePnL;
    meta: {
        computedAt: string;
        recvWindow: number;
        scannedSymbolsWithTrades: number;
        scannedSymbolsTotal: number;
        concurrency: number;
    };
    warnings?: any[];
    error?: string;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
    binanceError?: any;
}

// ==================== Error Types ====================

export class BinanceServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public binanceError?: any
    ) {
        super(message);
        this.name = 'BinanceServiceError';
    }
}

// ==================== Cache Keys ====================

function getPortfolioCacheKey(userId: string): string {
    return `binance:portfolio:${userId}`;
}

// ==================== Core Functions ====================

/**
 * Fetch portfolio data for a user
 * Uses Redis cache if available and not expired
 * @param userId User ID
 * @returns Portfolio data from Binance
 */
export async function fetchPortfolio(userId: string): Promise<BinancePortfolioData> {
    const cacheKey = getPortfolioCacheKey(userId);

    // Check cache first
    const cached = await cacheService.get<BinancePortfolioData>(cacheKey);
    if (cached) {
        logger.info(`Returning cached Binance portfolio for user ${userId}`);
        return cached;
    }

    // Get user's encrypted credentials
    const credentials = await getBinanceCredentials(userId);
    if (!credentials) {
        throw new BinanceServiceError(
            'Binance API keys not configured. Please configure your API keys in settings.',
            'KEYS_NOT_CONFIGURED'
        );
    }

    try {
        logger.info(`Fetching fresh Binance portfolio for user ${userId}`);

        // Call the Binance portfolio service
        const portfolioData = await binanceGetPortfolio(
            credentials.apiKey,
            credentials.apiSecret
        );

        // Check if request was successful
        if (!portfolioData.ok) {
            throw new BinanceServiceError(
                portfolioData.error || 'Failed to fetch portfolio from Binance',
                'BINANCE_API_ERROR',
                portfolioData
            );
        }

        // Cache the result
        await cacheService.set(cacheKey, portfolioData, config.binance.cacheTTL);

        logger.info(`Successfully fetched Binance portfolio for user ${userId}`);
        return portfolioData;
    } catch (error: any) {
        // Handle Binance-specific errors
        if (error.binance) {
            const binanceError = error.binance;

            // Rate limit errors
            if (binanceError.httpStatus === 429 || binanceError.code === -1003) {
                throw new BinanceServiceError(
                    'Binance API rate limit reached. Please try again in a few moments.',
                    'BINANCE_RATE_LIMIT',
                    binanceError
                );
            }

            // Invalid API keys
            if (
                binanceError.httpStatus === 401 ||
                binanceError.code === -2015 ||
                binanceError.code === -2014
            ) {
                throw new BinanceServiceError(
                    'Invalid Binance API keys. Please check your API key and secret in settings.',
                    'BINANCE_INVALID_KEYS',
                    binanceError
                );
            }

            // Timeout
            if (binanceError.timeout) {
                throw new BinanceServiceError(
                    'Request to Binance timed out. Please try again.',
                    'BINANCE_TIMEOUT',
                    binanceError
                );
            }

            // Generic Binance error
            throw new BinanceServiceError(
                binanceError.msg || 'Binance API error',
                'BINANCE_API_ERROR',
                binanceError
            );
        }

        // Already a BinanceServiceError, re-throw
        if (error instanceof BinanceServiceError) {
            throw error;
        }

        // Generic error
        logger.error('Unexpected error fetching Binance portfolio', { error, userId });
        throw new BinanceServiceError(
            'An unexpected error occurred while fetching your portfolio.',
            'INTERNAL_ERROR'
        );
    }
}

/**
 * Validate Binance API keys by making a test request
 * @param apiKey Binance API key
 * @param apiSecret Binance API secret
 * @returns Validation result with valid flag and error if invalid
 */
export async function validateApiKeys(
    apiKey: string,
    apiSecret: string
): Promise<ValidationResult> {
    try {
        logger.info('Validating Binance API keys');

        // Make a test request to Binance (fetch account info)
        const result = await binanceGetPortfolio(apiKey, apiSecret);

        if (!result.ok) {
            return {
                valid: false,
                error: result.error || 'API key validation failed',
                binanceError: result,
            };
        }

        logger.info('Binance API keys validated successfully');
        return { valid: true };
    } catch (error: any) {
        logger.warn('Binance API key validation failed', { error });

        if (error.binance) {
            const binanceError = error.binance;

            // Invalid credentials
            if (
                binanceError.httpStatus === 401 ||
                binanceError.code === -2015 ||
                binanceError.code === -2014
            ) {
                return {
                    valid: false,
                    error: 'Invalid API key or secret',
                    binanceError,
                };
            }

            // IP restriction
            if (binanceError.code === -2015) {
                return {
                    valid: false,
                    error: 'API key is IP restricted. Please check your Binance API settings.',
                    binanceError,
                };
            }

            // Generic Binance error
            return {
                valid: false,
                error: binanceError.msg || 'API key validation failed',
                binanceError,
            };
        }

        return {
            valid: false,
            error: 'Failed to validate API keys. Please try again.',
        };
    }
}

/**
 * Clear cached portfolio data for a user
 * @param userId User ID
 */
export async function clearPortfolioCache(userId: string): Promise<void> {
    const cacheKey = getPortfolioCacheKey(userId);
    await cacheService.deleteKey(cacheKey);
    logger.info(`Cleared Binance portfolio cache for user ${userId}`);
}

/**
 * Clear global Binance caches (exchange info, ticker prices)
 */
export function clearGlobalCache(): void {
    binanceClearCache();
    logger.info('Cleared global Binance caches');
}
