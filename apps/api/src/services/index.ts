import logger from '../config/logger';
import { closeDB } from '../config/db';
import { closeAllIgClients } from '../client/Instagram';
import { stopAllScheduledPosts } from '../client/scheduledPosts';

// Graceful shutdown function
export const shutdown = (server: any) => {
  try {
    logger.info('Shutting down gracefully...');
    const cleanup = async () => {
      stopAllScheduledPosts();
      await closeAllIgClients().catch(() => undefined);
      await closeDB();
    };

    void cleanup().finally(() => {
      server.close(() => {
        logger.info('Closed all connections gracefully.');
        process.exit(0);
      });
    });

    setTimeout(() => {
      logger.error('Forcing shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } catch (error: any) {
    logger.error(`Error during shutdown: ${error.message}`);
    process.exit(1);
  }
};
