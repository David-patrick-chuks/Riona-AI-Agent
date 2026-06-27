import fs from 'fs/promises';
import path from 'path';
import { canSendTweet, saveTweetData } from './index';

describe('canSendTweet', () => {
  const tweetDataPath = path.join(__dirname, '../data/tweetData.json');

  afterEach(async () => {
    try {
      await fs.unlink(tweetDataPath);
    } catch {
      /* ignore */
    }
  });

  test('allows tweets when no history file exists', async () => {
    await expect(canSendTweet()).resolves.toBe(true);
  });

  test('allows tweets when under daily limit', async () => {
    await fs.mkdir(path.dirname(tweetDataPath), { recursive: true });
    const recent = Array.from({ length: 10 }, (_, i) => ({
      tweetContent: `tweet-${i}`,
      imageUrl: null,
      timeTweeted: new Date().toISOString(),
    }));
    await fs.writeFile(tweetDataPath, JSON.stringify(recent));

    await expect(canSendTweet()).resolves.toBe(true);
  });

  test('blocks tweets at 17 per rolling window', async () => {
    await fs.mkdir(path.dirname(tweetDataPath), { recursive: true });
    const atLimit = Array.from({ length: 17 }, (_, i) => ({
      tweetContent: `tweet-${i}`,
      imageUrl: null,
      timeTweeted: new Date().toISOString(),
    }));
    await fs.writeFile(tweetDataPath, JSON.stringify(atLimit));

    await expect(canSendTweet()).resolves.toBe(false);
  });

  test('saveTweetData appends tweet records', async () => {
    const now = new Date().toISOString();
    await saveTweetData('First tweet', '', now);
    await saveTweetData('Second tweet', 'https://example.com/img.png', now);

    const raw = await fs.readFile(tweetDataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].tweetContent).toBe('First tweet');
    expect(parsed[1].imageUrl).toBe('https://example.com/img.png');
  });
});
