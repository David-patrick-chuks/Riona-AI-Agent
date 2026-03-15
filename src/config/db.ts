import mongoose from 'mongoose';
import logger from './logger';
import { getBoolEnv } from '../utils/env';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || '';
  const required = getBoolEnv('MONGODB_REQUIRED', false);

  if (!uri) {
    const msg = 'MONGODB_URI is not set. Skipping database connection.';
    if (required) {
      logger.error(msg);
      process.exit(1);
    } else {
      logger.warn(msg);
      return false;
    }
  }

  const connectWithRetry = async (retries = 5, delay = 5000) => {
    try {
      await mongoose.connect(uri, {
        connectTimeoutMS: 60000, // Increase connection timeout to 60 seconds
        serverSelectionTimeoutMS: 60000 // Increase server selection timeout
      });
      logger.info('MongoDB connected');
      return true;
    } catch (error) {
      if (retries <= 0) {
        logger.error('MongoDB connection failed after multiple attempts:', error);
        if (required) {
          process.exit(1);
        }
        return false;
      }

      logger.warn(`MongoDB connection attempt failed. Retrying in ${delay / 1000} seconds... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(retries - 1, delay);
    }
  };

  return connectWithRetry();
};
