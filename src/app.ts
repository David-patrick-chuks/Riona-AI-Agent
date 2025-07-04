import express, { Application } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet"; // For securing HTTP headers
import cors from "cors";
import session from 'express-session';

import logger, { setupErrorHandlers } from "./config/logger";
import { setup_HandleError } from "./utils";
import { connectDB } from "./config/db";
import apiRoutes from "./routes/api";
// import { main as twitterMain } from './client/Twitter'; //
// import { main as githubMain } from './client/GitHub'; //

// Set up process-level error handlers
setupErrorHandlers();

// Initialize environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();

// Connect to the database
connectDB();

// Middleware setup
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'"],
        },
    },
}));
app.use(cors());
app.use(express.json()); // JSON body parsing
app.use(express.urlencoded({ extended: true, limit: "1kb" })); // URL-encoded data
app.use(cookieParser()); // Cookie parsing
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000, sameSite: 'lax' },
}));

// Serve static files from the 'public' directory
app.use(express.static('frontend/dist'));

// API Routes
app.use('/api', apiRoutes);

app.get('*', (_req, res) => {
    res.sendFile('index.html', { root: 'frontend/dist' });
});

/*
const runAgents = async () => {
  while (true) {
    logger.info("Starting Instagram agent iteration...");
    await runInstagram();
    logger.info("Instagram agent iteration finished.");

    // logger.info("Starting Twitter agent...");
    // await twitterMain();
    // logger.info("Twitter agent finished.");

    // logger.info("Starting GitHub agent...");
    // await githubMain();
    // logger.info("GitHub agent finished.");

    // Wait for 30 seconds before next iteration
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
};

runAgents().catch((error) => {
  setup_HandleError(error, "Error running agents:");
});
*/

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
