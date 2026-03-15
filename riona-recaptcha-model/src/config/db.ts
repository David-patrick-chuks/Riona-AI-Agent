import mongoose from 'mongoose';
import CONFIG from '@/config/default';
import logger from '@/utils/logger';

const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(CONFIG.MONGODB_URI);
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
