import logger from '../utils/logger.js';
import config from '../config/config.js';
import { getUsersWithBinanceConfigured } from '../models/User.js';
import { fetchPortfolio } from './binanceService.js';
import { createBinanceSnapshot, hasSnapshotForDate } from '../models/BinanceSnapshot.js';

export interface SchedulerStats {
    lastRun?: Date;
    nextRun?: Date;
    usersProcessed: number;
    snapshotsCreated: number;
    errors: number;
    isRunning: boolean;
}

class BinanceSnapshotScheduler {
    private timeout: NodeJS.Timeout | null = null;
    private dailyInterval: NodeJS.Timeout | null = null;
    private targetHour: number;
    private isRunning: boolean = false;
    private stats: SchedulerStats = {
        usersProcessed: 0,
        snapshotsCreated: 0,
        errors: 0,
        isRunning: false,
    };

    constructor(targetHour: number = 0) {
        this.targetHour = targetHour; // 0 = midnight UTC
        logger.info('BinanceSnapshotScheduler created', {
            targetHour: `${targetHour}:00 UTC`,
        });
    }

    /**
     * Calculate milliseconds until next target hour in UTC
     */
    private getMsUntilNextRun(): number {
        const now = new Date();
        const next = new Date();

        next.setUTCHours(this.targetHour, 0, 0, 0);

        // If target time has already passed today, schedule for tomorrow
        if (next.getTime() <= now.getTime()) {
            next.setUTCDate(next.getUTCDate() + 1);
        }

        return next.getTime() - now.getTime();
    }

    /**
     * Run the daily snapshot creation for all configured users
     */
    private async runDailySnapshot(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Binance snapshot scheduler is already running, skipping this run');
            return;
        }

        this.isRunning = true;
        this.stats.isRunning = true;
        this.stats.lastRun = new Date();

        logger.info('Starting daily Binance snapshot creation');

        try {
            // Get all users with Binance API keys configured
            const userIds = await getUsersWithBinanceConfigured();

            logger.info(`Found ${userIds.length} users with Binance configured`);

            this.stats.usersProcessed = 0;
            this.stats.snapshotsCreated = 0;
            this.stats.errors = 0;

            // Process each user
            for (const userId of userIds) {
                try {
                    // Check if snapshot already exists for today
                    const today = new Date();
                    const hasSnapshot = await hasSnapshotForDate(userId, today);

                    if (hasSnapshot) {
                        logger.info(`Snapshot already exists for user ${userId} today, skipping`);
                        this.stats.usersProcessed++;
                        continue;
                    }

                    // Fetch portfolio
                    const portfolioData = await fetchPortfolio(userId);

                    // Create snapshot
                    await createBinanceSnapshot(userId, portfolioData);

                    this.stats.usersProcessed++;
                    this.stats.snapshotsCreated++;

                    logger.info(`Created Binance snapshot for user ${userId}`);

                    // Add a small delay between users to avoid overwhelming Binance API
                    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
                } catch (error) {
                    this.stats.errors++;
                    logger.error(`Failed to create Binance snapshot for user ${userId}`, { error });
                    // Continue with next user even if one fails
                }
            }

            logger.info('Daily Binance snapshot creation completed', {
                usersProcessed: this.stats.usersProcessed,
                snapshotsCreated: this.stats.snapshotsCreated,
                errors: this.stats.errors,
            });
        } catch (error) {
            logger.error('Error during daily Binance snapshot creation', { error });
            this.stats.errors++;
        } finally {
            this.isRunning = false;
            this.stats.isRunning = false;

            // Schedule next run
            const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000);
            nextRun.setUTCHours(this.targetHour, 0, 0, 0);
            this.stats.nextRun = nextRun;
        }
    }

    /**
     * Start the scheduler
     */
    start(): void {
        if (this.timeout || this.dailyInterval) {
            logger.warn('Binance snapshot scheduler is already running');
            return;
        }

        logger.info('Starting Binance snapshot scheduler');

        // Calculate time until first run
        const msUntilFirst = this.getMsUntilNextRun();
        const nextRun = new Date(Date.now() + msUntilFirst);

        logger.info(`First Binance snapshot scheduled for ${nextRun.toISOString()}`);

        this.stats.nextRun = nextRun;

        // Schedule first run
        this.timeout = setTimeout(() => {
            this.runDailySnapshot().catch((error) => {
                logger.error('Daily Binance snapshot failed', { error });
            });

            // After first run, schedule daily runs at the same time
            this.dailyInterval = setInterval(() => {
                this.runDailySnapshot().catch((error) => {
                    logger.error('Daily Binance snapshot failed', { error });
                });
            }, 24 * 60 * 60 * 1000); // 24 hours
        }, msUntilFirst);

        logger.info('Binance snapshot scheduler started successfully');
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (this.dailyInterval) {
            clearInterval(this.dailyInterval);
            this.dailyInterval = null;
        }

        logger.info('Binance snapshot scheduler stopped');
    }

    /**
     * Get scheduler statistics
     */
    getStats(): SchedulerStats {
        return { ...this.stats };
    }

    /**
     * Manually trigger a snapshot creation for all users
     * (Useful for testing or manual backfills)
     */
    async triggerManualRun(): Promise<SchedulerStats> {
        logger.info('Manually triggering Binance snapshot creation');

        await this.runDailySnapshot();

        return this.getStats();
    }
}

// Create singleton instance
const binanceSnapshotScheduler = new BinanceSnapshotScheduler(config.binance.dailySnapshotHour);

export default binanceSnapshotScheduler;
