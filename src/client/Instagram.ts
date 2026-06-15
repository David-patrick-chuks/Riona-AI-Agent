import { IgClient } from './IG-bot/IgClient';
import logger from '../config/logger';

/**
 * Instagram client entry stored in the map
 */
type ClientEntry = {
    client: IgClient;
    creds: { username: string; password: string };
    lastInitError: string | null;
    lastInitAt: string | null;
};

/**
 * Map of account keys to Instagram clients
 */
const igClients = new Map<string, ClientEntry>();

/**
 * Gets a snapshot of all Instagram clients and their statuses
 * @returns Object mapping account keys to their statuses
 */
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

/**
 * Gets an existing Instagram client or creates a new one
 * @param username - Instagram username (optional if using account key)
 * @param password - Instagram password (optional if using account key)
 * @param accountKey - Account key to use (defaults to 'default')
 * @returns Initialized Instagram client
 * @throws Error if client initialization fails
 */
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

/**
 * Gets the status of an Instagram client
 * @param accountKey - Account key (defaults to 'default')
 * @returns Status object with initialized flag, last init time, and error
 */
export const getIgClientStatus = (accountKey: string = 'default') => {
    const entry = igClients.get(accountKey);
    return {
        initialized: !!entry,
        lastInitAt: entry?.lastInitAt || null,
        lastInitError: entry?.lastInitError || null,
    };
};

/**
 * Closes an Instagram client and removes it from the map
 * @param accountKey - Account key (defaults to 'default')
 */
export const closeIgClient = async (accountKey: string = 'default') => {
    const entry = igClients.get(accountKey);
    if (entry) {
        await entry.client.close();
        igClients.delete(accountKey);
    }
};

export { scrapeFollowersHandler } from './IG-bot/IgClient'; 
