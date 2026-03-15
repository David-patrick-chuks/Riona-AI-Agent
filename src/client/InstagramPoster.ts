import { InstagramClient } from './IG-bot';
import logger from '../config/logger';

let posterClient: InstagramClient | null = null;
let posterCreds: { username: string; password: string } | null = null;

export const getPosterClient = async (
  username?: string,
  password?: string,
): Promise<InstagramClient> => {
  const u = username || process.env.IGusername || '';
  const p = password || process.env.IGpassword || '';
  if (!u || !p) {
    throw new Error('IGusername and IGpassword are required for posting.');
  }

  if (!posterClient || !posterCreds || posterCreds.username !== u || posterCreds.password !== p) {
    posterClient = new InstagramClient(u, p);
    posterCreds = { username: u, password: p };
    try {
      await posterClient.login();
    } catch (error) {
      logger.error('Failed to login for posting', error);
      throw error;
    }
  }

  return posterClient;
};
