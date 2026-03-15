import { Request, Response } from 'express';
import Prediction from '@/models/prediction';
import logger from '@/utils/logger';

const AdminController = {
    getStats: async (req: Request, res: Response) => {
        try {
            const range = req.query.range || '24h';
            let timeFilter = {};
            const now = new Date();

            if (range === '1h') timeFilter = { timestamp: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } };
            else if (range === '24h') timeFilter = { timestamp: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
            else if (range === '7d') timeFilter = { timestamp: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };

            const total = await Prediction.countDocuments(timeFilter);
            const correct = await Prediction.countDocuments({ ...timeFilter, classification: 'CORRECT' });
            const incorrect = await Prediction.countDocuments({ ...timeFilter, classification: 'INCORRECT' });

            // Average confidence
            const avgConfidenceResult = await Prediction.aggregate([
                { $match: timeFilter },
                { $group: { _id: null, avgScore: { $avg: "$score" } } }
            ]);
            const avgConfidence = avgConfidenceResult.length > 0 ? avgConfidenceResult[0].avgScore : 0;

            // Top IPs
            const topIPs = await Prediction.aggregate([
                { $match: timeFilter },
                { $group: { _id: "$ip", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]);

            const recent = await Prediction.find(timeFilter).sort({ timestamp: -1 }).limit(10);

            // Group by hours for graph
            const hourlyStats = await Prediction.aggregate([
                { $match: timeFilter },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" }
                        },
                        count: { $sum: 1 },
                        correct: {
                            $sum: { $cond: [{ $eq: ["$classification", "CORRECT"] }, 1, 0] }
                        }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            res.json({
                stats: {
                    total,
                    correct,
                    incorrect,
                    accuracy: total > 0 ? ((correct / total) * 100).toFixed(2) : 0,
                    avgConfidence: avgConfidence.toFixed(4)
                },
                system: {
                    memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
                    uptime: Math.floor(process.uptime()) + 's'
                },
                topIPs,
                recent,
                graph: hourlyStats
            });
        } catch (err: any) {
            logger.error('Admin Stats Error:', err.message);
            res.status(500).json({ error: 'Server Error' });
        }
    },

    clearLogs: async (req: Request, res: Response) => {
        try {
            await Prediction.deleteMany({});
            res.json({ message: 'Logs cleared' });
        } catch (err: any) {
            res.status(500).json({ error: 'Failed to clear logs' });
        }
    }
};

export default AdminController;
