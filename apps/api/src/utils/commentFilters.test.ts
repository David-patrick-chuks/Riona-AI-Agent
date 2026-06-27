import { getCommentFilterConfig, parseCommentSentiment, shouldSkipComment } from './commentFilters';

describe('comment filters', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('denylist blocks comments', () => {
    process.env.IG_COMMENT_DENYLIST = 'spam,scam';
    const cfg = getCommentFilterConfig();
    expect(shouldSkipComment('This is a scam', cfg)).toBe(true);
  });

  test('allowlist requires match', () => {
    process.env.IG_COMMENT_ALLOWLIST = 'nice';
    const cfg = getCommentFilterConfig();
    expect(shouldSkipComment('great work', cfg)).toBe(true);
    expect(shouldSkipComment('nice shot', cfg)).toBe(false);
  });

  test('positive sentiment blocks negative', () => {
    process.env.IG_COMMENT_SENTIMENT = 'positive';
    const cfg = getCommentFilterConfig();
    expect(shouldSkipComment('this is terrible', cfg)).toBe(true);
  });

  test('parseCommentSentiment accepts documented values', () => {
    expect(parseCommentSentiment('positive')).toBe('positive');
    expect(parseCommentSentiment('neutral')).toBe('neutral');
    expect(parseCommentSentiment('any')).toBe('any');
    expect(parseCommentSentiment(undefined)).toBe('any');
  });

  test('parseCommentSentiment falls back to any for invalid values', () => {
    expect(parseCommentSentiment('positve')).toBe('any');
    expect(parseCommentSentiment('negative')).toBe('any');
    expect(parseCommentSentiment('')).toBe('any');
  });

  test('invalid IG_COMMENT_SENTIMENT falls back to any instead of unknown value', () => {
    process.env.IG_COMMENT_SENTIMENT = 'positve';
    const cfg = getCommentFilterConfig();
    expect(cfg.sentiment).toBe('any');
  });

  test('neutral sentiment blocks negative comments', () => {
    process.env.IG_COMMENT_SENTIMENT = 'neutral';
    const cfg = getCommentFilterConfig();
    expect(shouldSkipComment('this is terrible', cfg)).toBe(true);
    expect(shouldSkipComment('nice photo', cfg)).toBe(false);
  });

  test('minimum and maximum length filters comments', () => {
    process.env.IG_COMMENT_MIN_LENGTH = '10';
    process.env.IG_COMMENT_MAX_LENGTH = '30';
    const cfg = getCommentFilterConfig();
    expect(shouldSkipComment('short', cfg)).toBe(true);
    expect(shouldSkipComment('this comment is definitely way too long for the limit', cfg)).toBe(
      true,
    );
    expect(shouldSkipComment('this is fine', cfg)).toBe(false);
  });
});
