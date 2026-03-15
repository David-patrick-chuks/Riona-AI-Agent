import mongoose, { Schema, Document } from 'mongoose';
import logger from '@/utils/logger';

export interface IMemoryEntry extends Document {
    type: 'interaction' | 'observation' | 'directive';
    content: string;
    userId?: string; // Twitter user ID or Handle
    metadata?: any;
    timestamp: Date;
}

const MemorySchema: Schema = new Schema({
    type: { type: String, enum: ['interaction', 'observation', 'directive'], required: true },
    content: { type: String, required: true },
    userId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true }
});

const Memory = mongoose.model<IMemoryEntry>('Memory', MemorySchema);

class MemoryService {
    /**
     * Store a new memory
     */
    async remember(entry: Partial<IMemoryEntry>) {
        try {
            const memory = await Memory.create(entry);
            logger.info(`Memory Saved: [${entry.type}] ${entry.content?.substring(0, 50)}...`);
            return memory;
        } catch (err: any) {
            logger.error('Failed to save memory:', err.message);
        }
    }

    /**
     * Retrieve recent memories related to a specific user
     */
    async getHistory(userId: string, limit: number = 5) {
        try {
            return await Memory.find({ userId }).sort({ timestamp: -1 }).limit(limit);
        } catch (err: any) {
            logger.error('Failed to retrieve history:', err.message);
            return [];
        }
    }

    /**
     * Search observations for a specific keyword
     */
    async searchObservations(query: string, limit: number = 10) {
        try {
            return await Memory.find({
                type: 'observation',
                content: { $regex: query, $options: 'i' }
            }).sort({ timestamp: -1 }).limit(limit);
        } catch (err) {
            return [];
        }
    }
}

export default new MemoryService();
