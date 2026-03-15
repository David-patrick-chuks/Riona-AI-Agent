/**
 * Simple logger utility for standardization.
 */
const logger = {
    info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
    debug: (msg: string, ...args: any[]) => {
        if (process.env.DEBUG) console.debug(`[DEBUG] ${msg}`, ...args);
    }
};

export default logger;
