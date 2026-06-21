import { IgClient } from './IG-bot/IgClient';
import logger from '../config/logger';
import { IGpassword, IGusername } from '../secret';

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
const initPromises = new Map<string, Promise<IgClient>>();

const isInitialized = (entry: ClientEntry | undefined): boolean =>
  !!entry && entry.lastInitError === null && entry.lastInitAt !== null;

/**
 * Gets a snapshot of all Instagram clients and their statuses
 * @returns Object mapping account keys to their statuses
 */
export const getIgClientsSnapshot = () => {
  const out: Record<
    string,
    { initialized: boolean; lastInitAt: string | null; lastInitError: string | null }
  > = {};
  for (const [key, entry] of igClients.entries()) {
    out[key] = {
      initialized: isInitialized(entry),
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
export const getIgClient = async (
  username?: string,
  password?: string,
  accountKey: string = 'default',
): Promise<IgClient> => {
  const key = accountKey || 'default';
  const entry = igClients.get(key);
  const needsReinit =
    !entry ||
    entry.lastInitError !== null ||
    (username &&
      password &&
      (entry.creds.username !== username || entry.creds.password !== password));

  if (!needsReinit && entry) {
    return entry.client;
  }

  const pending = initPromises.get(key);
  if (pending) {
    return pending;
  }

  const initPromise = (async () => {
    if (entry) {
      await entry.client.close().catch(() => undefined);
      igClients.delete(key);
    }

    const resolvedUsername = username || entry?.creds.username || IGusername;
    const resolvedPassword = password || entry?.creds.password || IGpassword;
    const client = new IgClient(resolvedUsername, resolvedPassword, key);
    const creds = { username: resolvedUsername, password: resolvedPassword };
    try {
      await client.init();
      igClients.set(key, {
        client,
        creds,
        lastInitError: null,
        lastInitAt: new Date().toISOString(),
      });
      return client;
    } catch (error) {
      logger.error('Failed to initialize Instagram client', error);
      igClients.set(key, {
        client,
        creds,
        lastInitError: error instanceof Error ? error.message : String(error),
        lastInitAt: null,
      });
      throw error;
    } finally {
      initPromises.delete(key);
    }
  })();

  initPromises.set(key, initPromise);
  return initPromise;
};

/**
 * Gets the status of an Instagram client
 * @param accountKey - Account key (defaults to 'default')
 * @returns Status object with initialized flag, last init time, and error
 */
export const getIgClientStatus = (accountKey: string = 'default') => {
  const entry = igClients.get(accountKey);
  return {
    initialized: isInitialized(entry),
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

/**
 * Closes all Instagram clients across all accounts.
 */
export const closeAllIgClients = async () => {
  const keys = [...igClients.keys()];
  await Promise.all(
    keys.map((key) =>
      closeIgClient(key).catch((err) => {
        logger.warn(`Failed to close IG client for account "${key}":`, err);
      }),
    ),
  );
};

export async function scrapeFollowersHandler(
  targetAccount: string,
  maxFollowers: number,
  username?: string,
  password?: string,
  accountKey: string = 'default',
) {
  const client = await getIgClient(username, password, accountKey);
  return client.scrapeFollowers(targetAccount, maxFollowers);
}
