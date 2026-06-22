import { InstagramClient } from './IG-bot';
import logger from '../config/logger';
import { getAccount } from '../config/accounts';
import { IGpassword, IGusername } from '../secret';
import {
  cancelScheduledPost,
  listScheduledPosts,
  schedulePostJob,
  stopAllScheduledPosts,
} from './scheduledPosts';

type PosterEntry = { client: InstagramClient; creds: { username: string; password: string } };

const posterClients = new Map<string, PosterEntry>();

const resolveCredentials = (
  username?: string,
  password?: string,
  accountKey: string = 'default',
): { username: string; password: string } => {
  const fromAccount = getAccount(accountKey);
  const u = username || fromAccount?.username || process.env.IGusername || IGusername || '';
  const p = password || fromAccount?.password || process.env.IGpassword || IGpassword || '';
  return { username: u, password: p };
};

export const getPosterClient = async (
  username?: string,
  password?: string,
  accountKey: string = 'default',
): Promise<InstagramClient> => {
  const { username: u, password: p } = resolveCredentials(username, password, accountKey);
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

export const postPhotoBuffer = async (
  buffer: Buffer,
  caption: string = '',
  accountKey: string = 'default',
) => {
  const client = await getPosterClient(undefined, undefined, accountKey);
  return client.postPhotoBuffer(buffer, caption);
};

export const schedulePhotoPost = async (
  imageUrl: string,
  caption: string,
  cronTime: string,
  accountKey: string = 'default',
): Promise<string> => {
  const client = await getPosterClient(undefined, undefined, accountKey);
  return schedulePostJob(
    accountKey,
    'instagram',
    cronTime,
    async () => {
      await client.postPhoto(imageUrl, caption);
    },
    { url: imageUrl, caption },
  );
};

export { cancelScheduledPost, listScheduledPosts, stopAllScheduledPosts };
