import { twitterClient } from './index';
import logger from '../../../config/logger';
import { schedulePostJob } from '../../scheduledPosts';

/**
 * Schedules a text-only tweet to X/Twitter.
 * @param text The text CONTENT of the tweet.
 * @param cronTime The cron expression for scheduling.
 * @param accountKey Optional account identifier.
 */
export async function scheduleTweet(
  text: string,
  cronTime: string,
  accountKey: string = 'default',
): Promise<string> {
  return schedulePostJob(
    accountKey,
    'twitter',
    cronTime,
    async () => {
      await postTweet(text);
    },
    { text },
  );
}

/**
 * Posts a text-only tweet to X/Twitter.
 * @param text The content of the tweet.
 * @returns The resulting tweet data.
 */
export async function postTweet(text: string) {
  if (!text) {
    throw new Error('Tweet text is required');
  }

  logger.info(`Attempting to post tweet: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

  try {
    const { data: createdTweet } = await twitterClient.v2.tweet(text);
    logger.info(`Successfully posted tweet. ID: ${createdTweet.id}`);
    return createdTweet;
  } catch (error) {
    logger.error('Failed to post tweet:', error);
    throw error;
  }
}
