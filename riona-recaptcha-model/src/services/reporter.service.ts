import { Server } from 'socket.io';
import logger from '@/utils/logger';

class ReporterService {
    private io: Server | null = null;

    init(server: any) {
        this.io = new Server(server, {
            cors: { origin: "*" }
        });

        this.io.on('connection', (socket) => {
            logger.info('Dashboard Client Connected: ' + socket.id);
        });
    }

    /**
     * Send a status update to the dashboard
     */
    report(data: {
        type: 'thought' | 'action' | 'system' | 'report';
        message: string;
        details?: any;
    }) {
        if (this.io) {
            this.io.emit('riona_update', {
                ...data,
                timestamp: new Date()
            });
        }

        // Also log to console for safety
        logger.info(`[REPORTER] ${data.type.toUpperCase()}: ${data.message}`);
    }
}

export default new ReporterService();
