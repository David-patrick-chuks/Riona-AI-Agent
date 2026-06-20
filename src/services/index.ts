import logger from "../config/logger";
import mongoose from "mongoose";
import { closeIgClient } from "../client/Instagram";

// Graceful shutdown function
export const shutdown = (server: any) => {
    try {
      logger.info("Shutting down gracefully...");
      const cleanup = async () => {
        await closeIgClient("default").catch(() => undefined);
        if (mongoose.connection.readyState === 1) {
          await mongoose.disconnect().catch(() => undefined);
        }
      };

      void cleanup().finally(() => {
        server.close(() => {
          logger.info("Closed all connections gracefully.");
          process.exit(0);
        });
      });

      setTimeout(() => {
        logger.error("Forcing shutdown after timeout.");
        process.exit(1);
      }, 10000);
  
    } catch (error: any) {
      logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  };
