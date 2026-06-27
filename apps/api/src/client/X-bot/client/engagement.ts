import { twitterClient } from './index';
import logger from '../../../config/logger';

/**
 * Likes a tweet.
 * @param tweetId The ID of the tweet to like.
 */
export async function likeTweet(tweetId: string) {
  try {
    const me = await twitterClient.v2.me();
    await twitterClient.v2.like(me.data.id, tweetId);
    logger.info(`Successfully liked tweet ${tweetId}`);
    return { success: true, tweetId };
  } catch (error) {
    logger.error(`Error liking tweet ${tweetId}:`, error);
    throw error;
  }
}

/**
 * Retweets a tweet.
 * @param tweetId The ID of the tweet to retweet.
 */
export async function retweet(tweetId: string) {
  try {
    const me = await twitterClient.v2.me();
    await twitterClient.v2.retweet(me.data.id, tweetId);
    logger.info(`Successfully retweeted tweet ${tweetId}`);
    return { success: true, tweetId };
  } catch (error) {
    logger.error(`Error retweeting tweet ${tweetId}:`, error);
    throw error;
  }
}

/**
 * Replies to a tweet.
 * @param tweetId The ID of the tweet to reply to.
 * @param text The text CONTENT of the reply.
 */
export async function replyToTweet(tweetId: string, text: string) {
  try {
    const result = await twitterClient.v2.reply(text, tweetId);
    logger.info(`Successfully replied to tweet ${tweetId}`);
    return { success: true, tweetId, replyId: result.data.id };
  } catch (error) {
    logger.error(`Error replying to tweet ${tweetId}:`, error);
    throw error;
  }
}
