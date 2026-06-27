import { twitterClient } from './index';
import logger from '../../../config/logger';
import { schedulePostJob } from '../../scheduledPosts';
import { canSendTweet } from '../../../utils';

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

  const allowed = await canSendTweet();
  if (!allowed) {
    throw new Error('Twitter rate limit reached (max 17 tweets per 24 hours)');
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

/**
 * Posts a tweet with an image attachment.
 */
export async function postTweetWithMedia(
  text: string,
  media: Buffer,
  mimeType = 'image/png',
): Promise<{ id: string; text?: string }> {
  if (!text) throw new Error('Tweet text is required');
  if (!media?.length) throw new Error('Media buffer is required');

  const allowed = await canSendTweet();
  if (!allowed) {
    throw new Error('Twitter rate limit reached (max 17 tweets per 24 hours)');
  }

  try {
    const mediaId = await twitterClient.v1.uploadMedia(media, { mimeType });
    const { data: createdTweet } = await twitterClient.v2.tweet({
      text,
      media: { media_ids: [mediaId] },
    });
    logger.info(`Successfully posted tweet with media. ID: ${createdTweet.id}`);
    return createdTweet;
  } catch (error) {
    logger.error('Failed to post tweet with media:', error);
    throw error;
  }
}
