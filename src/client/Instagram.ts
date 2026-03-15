import { IgClient } from './IG-bot/IgClient';
import logger from '../config/logger';

type ClientEntry = {
    client: IgClient;
    creds: { username: string; password: string };
    lastInitError: string | null;
    lastInitAt: string | null;
};

const igClients = new Map<string, ClientEntry>();

export const getIgClientsSnapshot = () => {
    const out: Record<string, { initialized: boolean; lastInitAt: string | null; lastInitError: string | null }> = {};
    for (const [key, entry] of igClients.entries()) {
        out[key] = {
            initialized: !!entry,
            lastInitAt: entry.lastInitAt,
            lastInitError: entry.lastInitError,
        };
    }
    return out;
};

export const getIgClient = async (username?: string, password?: string, accountKey: string = 'default'): Promise<IgClient> => {
    const key = accountKey || 'default';
    const entry = igClients.get(key);
    if (!entry || (username && password && (entry.creds.username !== username || entry.creds.password !== password))) {
        const client = new IgClient(username, password);
        const creds = { username: username || '', password: password || '' };
        try {
            await client.init();
            igClients.set(key, { client, creds, lastInitError: null, lastInitAt: new Date().toISOString() });
        } catch (error) {
            logger.error("Failed to initialize Instagram client", error);
            igClients.set(key, { client, creds, lastInitError: error instanceof Error ? error.message : String(error), lastInitAt: null });
            throw error;
        }
        return client;
    }
    return entry.client;
};

export const getIgClientStatus = (accountKey: string = 'default') => {
    const entry = igClients.get(accountKey);
    return {
        initialized: !!entry,
        lastInitAt: entry?.lastInitAt || null,
        lastInitError: entry?.lastInitError || null,
    };
};

export const closeIgClient = async (accountKey: string = 'default') => {
    const entry = igClients.get(accountKey);
    if (entry) {
        await entry.client.close();
        igClients.delete(accountKey);
    }
};

export { scrapeFollowersHandler } from './IG-bot/IgClient'; 
