import path from 'path';
import fs from 'fs';
import { setup_HandleError } from "../utils";

// Define log levels and their corresponding colors
const logLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        debug: 'blue',
    },
};

type Logger = {
    info: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
    error: (msg: string, meta?: unknown) => void;
    debug: (msg: string, meta?: unknown) => void;
};

// Custom function to format the timestamp
const customTimestamp = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedTime = `${hours % 12 || 12}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds} ${ampm}`;
    return formattedTime;
};

// Function to get emojis based on log level
const getEmojiForLevel = (level: string): string => {
    switch (level) {
        case 'info':
            return '💡';
        case 'error':
            return '🚨';
        case 'warn':
            return '⚠️';
        case 'debug':
            return '🐞';
        default:
            return '🔔';
    }
};

const formatMeta = (meta?: unknown) => {
    if (meta === undefined) return "";
    if (meta instanceof Error) return ` | ${meta.message}`;
    if (typeof meta === "string") return ` | ${meta}`;
    try {
        return ` | ${JSON.stringify(meta)}`;
    } catch {
        return " | [meta]";
    }
};

const createConsoleLogger = (): Logger => {
    return {
        info: (msg: string, meta?: unknown) => console.log(`${customTimestamp()} 💡 [info]: ${msg}${formatMeta(meta)}`),
        warn: (msg: string, meta?: unknown) => console.warn(`${customTimestamp()} ⚠️ [warn]: ${msg}${formatMeta(meta)}`),
        error: (msg: string, meta?: unknown) => console.error(`${customTimestamp()} 🚨 [error]: ${msg}${formatMeta(meta)}`),
        debug: (msg: string, meta?: unknown) => console.debug(`${customTimestamp()} 🐞 [debug]: ${msg}${formatMeta(meta)}`),
    };
};

const createWinstonLogger = (): Logger => {
    // Lazy-load winston only when needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const winston = require("winston");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("winston-daily-rotate-file");
    const { createLogger, format, transports } = winston;

    // Ensure the logs directory exists
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    return createLogger({
        levels: logLevels.levels,
        format: format.combine(
            format.timestamp({ format: customTimestamp }),
            format.colorize(),
            format.printf(({ timestamp, level, message }: any) => {
                const emoji = getEmojiForLevel(level);
                return `${timestamp} ${emoji} [${level}]: ${message}`;
            })
        ),
        transports: [
            new transports.Console({
                level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
                format: format.combine(
                    format.colorize(),
                    format.simple()
                ),
            }),
            new transports.DailyRotateFile({
                filename: "logs/%DATE%-combined.log",
                datePattern: "YYYY-MM-DD",
                level: "info",
                maxFiles: "14d",
                maxSize: "20m",
                zippedArchive: true,
                format: format.combine(format.timestamp(), format.json()),
            }),
            new transports.DailyRotateFile({
                filename: "logs/%DATE%-error.log",
                datePattern: "YYYY-MM-DD",
                level: "error",
                maxFiles: "14d",
                maxSize: "20m",
                zippedArchive: true,
                format: format.combine(format.timestamp(), format.json()),
            }),
            new transports.DailyRotateFile({
                filename: "logs/%DATE%-debug.log",
                datePattern: "YYYY-MM-DD",
                level: "debug",
                maxFiles: "14d",
                maxSize: "20m",
                zippedArchive: true,
                format: format.combine(format.timestamp(), format.json()),
            }),
        ],
    });
};

const logger: Logger =
    process.env.LOGGER === "console" ? createConsoleLogger() : createWinstonLogger();

export function setupErrorHandlers(): void {
    // Catch unhandled promise rejections
    process.on("unhandledRejection", (error: unknown) => {
        setup_HandleError(error, "Unhandled Rejection");
        process.exit(1);
    });

    // Catch uncaught exceptions
    process.on("uncaughtException", (error) => {
        setup_HandleError(error, "Uncaught Exception");
        process.exit(1);
    });

    // Catch process warnings
    process.on("warning", (warning) => {
        logger.warn(`Warning: ${warning.message || warning}`);
    });
}

export default logger;
