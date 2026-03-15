import { InstagramClient } from './IG-bot';
import logger from '../config/logger';

type PosterEntry = { client: InstagramClient; creds: { username: string; password: string } };\n+\n+const posterClients = new Map<string, PosterEntry>();

export const getPosterClient = async (
  username?: string,
  password?: string,
  accountKey: string = 'default'
): Promise<InstagramClient> => {
  const u = username || process.env.IGusername || '';
  const p = password || process.env.IGpassword || '';
  if (!u || !p) {
    throw new Error('IGusername and IGpassword are required for posting.');
  }

  const key = accountKey || 'default';
  const entry = posterClients.get(key);
  if (!entry || entry.creds.username !== u || entry.creds.password !== p) {
    const client = new InstagramClient(u, p);
    try {
      await client.login();
    } catch (error) {
      logger.error('Failed to login for posting', error);
      throw error;
    }
    posterClients.set(key, { client, creds: { username: u, password: p } });
    return client;
  }

  return entry.client;
};

export const postPhotoBuffer = async (buffer: Buffer, caption: string = '', accountKey: string = 'default') => {
  const client = await getPosterClient(undefined, undefined, accountKey);
  return client.postPhotoBuffer(buffer, caption);
};
