import express, { Application } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";

import { setupErrorHandlers } from "./config/logger";
import logger from "./config/logger";
import { connectDB } from "./config/db";
import apiRoutes from "./routes/api";
import { dashboardHtml } from "./views/dashboard";

setupErrorHandlers();
dotenv.config();

const app: Application = express();

connectDB();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'"],
      },
    },
  })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "1kb" }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000, sameSite: "lax" },
  })
);

app.use(express.static("frontend/dist"));

app.use("/api", apiRoutes);

app.get("/dashboard", (_req, res) => {
  res.type("html").send(dashboardHtml);
});

app.get(/.*/, (_req, res) => {
  res.sendFile("index.html", { root: "frontend/dist" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
