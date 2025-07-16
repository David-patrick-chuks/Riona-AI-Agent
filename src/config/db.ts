import mongoose from 'mongoose';
import logger from './logger';

export const connectDB = async () => {
  const connectWithRetry = async (retries = 5, delay = 5000) => {
    try {
      await mongoose.connect(process.env.MONGODB_URI || '', {
        connectTimeoutMS: 60000, // Increase connection timeout to 60 seconds
        serverSelectionTimeoutMS: 60000 // Increase server selection timeout
      });
      logger.info('MongoDB connected');
      return true;
    } catch (error) {
      if (retries <= 0) {
        logger.error('MongoDB connection failed after multiple attempts:', error);
        process.exit(1);
      }

      logger.warn(`MongoDB connection attempt failed. Retrying in ${delay / 1000} seconds... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(retries - 1, delay);
    }
  };

  return connectWithRetry();
};
