import express from 'express';
import cors from 'cors';
import path from 'path';
import CONFIG from '@/config/default';
import logger from '@/utils/logger';
import routes from '@/routes/recaptcha.routes';
import adminRoutes from '@/routes/admin.routes';
import controller from '@/controllers/recaptcha.controller';
import connectDB from '@/config/db';
import reporterService from '@/services/reporter.service';
import http from 'http';

// Express App
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Support JSON for admin API
app.use('/model', express.static(CONFIG.PATHS.MODEL_DIR));

// Serve Admin Dashboard
app.use('/admin', express.static(path.join(CONFIG.PATHS.ROOT, 'public/admin')));
app.use('/riona', express.static(path.join(CONFIG.PATHS.ROOT, 'public/riona')));
app.use('/debug', express.static(CONFIG.PATHS.DEBUG_DIR));
app.use('/uploads', express.static(path.join(CONFIG.PATHS.ROOT, 'public/uploads')));

// Routes
app.use('/', routes);
app.use('/api/admin', adminRoutes);

// Server Controller
const server = {
    app,
    start: async (): Promise<void> => {
        // 1. Connect Database
        await connectDB();

        // 2. Initialize Model
        await controller.initModel();

        // 3. Create HTTP Server for Socket.io
        const httpServer = http.createServer(app);
        reporterService.init(httpServer);

        // 4. Listen
        return new Promise((resolve) => {
            httpServer.listen(CONFIG.PORT, () => {
                logger.info(`Server running on http://localhost:${CONFIG.PORT}`);
                logger.info(`Admin Dashboard: http://localhost:${CONFIG.PORT}/admin`);
                logger.info(`riona Dashboard: http://localhost:${CONFIG.PORT}/riona`);
                resolve();
            });
        });
    },
};

export default server;
