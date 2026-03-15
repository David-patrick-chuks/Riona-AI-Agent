import { IgClient } from './IG-bot/IgClient';
import logger from '../config/logger';

let igClient: IgClient | null = null;
let lastCredentials: { username: string, password: string } | null = null;
let lastInitError: string | null = null;
let lastInitAt: string | null = null;

export const getIgClient = async (username?: string, password?: string): Promise<IgClient> => {
    if (!igClient || (username && password && (!lastCredentials || lastCredentials.username !== username || lastCredentials.password !== password))) {
        igClient = new IgClient(username, password);
        if (username && password) {
            lastCredentials = { username, password };
        }
        try {
            await igClient.init();
            lastInitError = null;
            lastInitAt = new Date().toISOString();
        } catch (error) {
            logger.error("Failed to initialize Instagram client", error);
            lastInitError = error instanceof Error ? error.message : String(error);
            throw error;
        }
    }
    return igClient;
};

export const getIgClientStatus = () => ({
    initialized: !!igClient,
    lastInitAt,
    lastInitError,
});

export const closeIgClient = async () => {
    if (igClient) {
        await igClient.close();
        igClient = null;
    }
};

export { scrapeFollowersHandler } from './IG-bot/IgClient'; 
