import 'dotenv/config';
import { connectToDatabase } from '../config/database.js';
import {
  initializeSymbolMappingIndexes,
  bulkInsertMappings,
} from '../models/SymbolMapping.js';
import { PREDEFINED_MAPPINGS } from '../data/predefinedMappings.js';
import logger from '../utils/logger.js';

/**
 * Initialize symbol mappings in the database
 */
async function initSymbolMappings() {
  try {
    logger.info('Starting symbol mappings initialization...');

    // Connect to database
    await connectToDatabase();
    logger.info('Connected to database');

    // Create indexes
    await initializeSymbolMappingIndexes();
    logger.info('Indexes created');

    // Insert predefined mappings
    await bulkInsertMappings(PREDEFINED_MAPPINGS);
    logger.info(`Inserted/updated ${PREDEFINED_MAPPINGS.length} symbol mappings`);

    // Log some stats
    const etfCount = PREDEFINED_MAPPINGS.filter((m) => m.type === 'etf').length;
    const stockCount = PREDEFINED_MAPPINGS.filter((m) => m.type === 'stock').length;

    logger.info('Mappings summary:', {
      total: PREDEFINED_MAPPINGS.length,
      etfs: etfCount,
      stocks: stockCount,
    });

    logger.info('✅ Symbol mappings initialization completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize symbol mappings:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initSymbolMappings();
}

export { initSymbolMappings };
