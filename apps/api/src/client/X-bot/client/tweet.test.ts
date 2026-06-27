jest.mock('./index', () => ({
  twitterClient: {
    v1: { uploadMedia: jest.fn() },
    v2: { tweet: jest.fn() },
  },
}));

jest.mock('../../../utils', () => ({
  canSendTweet: jest.fn(),
}));

jest.mock('../../../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { postTweet, postTweetWithMedia } from './tweet';
import { twitterClient } from './index';
import { canSendTweet } from '../../../utils';

describe('tweet client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (canSendTweet as jest.Mock).mockResolvedValue(true);
    (twitterClient.v2.tweet as jest.Mock).mockResolvedValue({
      data: { id: 'tweet-123', text: 'Hello world' },
    });
    (twitterClient.v1.uploadMedia as jest.Mock).mockResolvedValue('media-456');
  });

  describe('postTweet', () => {
    test('rejects empty text', async () => {
      await expect(postTweet('')).rejects.toThrow('Tweet text is required');
      expect(twitterClient.v2.tweet).not.toHaveBeenCalled();
    });

    test('rejects when rate limit reached', async () => {
      (canSendTweet as jest.Mock).mockResolvedValue(false);

      await expect(postTweet('Hello')).rejects.toThrow(
        'Twitter rate limit reached (max 17 tweets per 24 hours)',
      );
      expect(twitterClient.v2.tweet).not.toHaveBeenCalled();
    });

    test('posts tweet when allowed', async () => {
      const result = await postTweet('Hello world');

      expect(canSendTweet).toHaveBeenCalled();
      expect(twitterClient.v2.tweet).toHaveBeenCalledWith('Hello world');
      expect(result).toEqual({ id: 'tweet-123', text: 'Hello world' });
    });

    test('propagates API errors', async () => {
      (twitterClient.v2.tweet as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      await expect(postTweet('Hello')).rejects.toThrow('API unavailable');
    });
  });

  describe('postTweetWithMedia', () => {
    const media = Buffer.from('fake-image');

    test('rejects missing text', async () => {
      await expect(postTweetWithMedia('', media)).rejects.toThrow('Tweet text is required');
    });

    test('rejects empty media buffer', async () => {
      await expect(postTweetWithMedia('Caption', Buffer.alloc(0))).rejects.toThrow(
        'Media buffer is required',
      );
    });

    test('rejects when rate limit reached', async () => {
      (canSendTweet as jest.Mock).mockResolvedValue(false);

      await expect(postTweetWithMedia('Caption', media)).rejects.toThrow(
        'Twitter rate limit reached (max 17 tweets per 24 hours)',
      );
    });

    test('uploads media and posts tweet', async () => {
      const result = await postTweetWithMedia('Caption', media, 'image/jpeg');

      expect(twitterClient.v1.uploadMedia).toHaveBeenCalledWith(media, { mimeType: 'image/jpeg' });
      expect(twitterClient.v2.tweet).toHaveBeenCalledWith({
        text: 'Caption',
        media: { media_ids: ['media-456'] },
      });
      expect(result.id).toBe('tweet-123');
    });
  });
});
