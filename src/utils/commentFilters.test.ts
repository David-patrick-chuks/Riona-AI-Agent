import { getCommentFilterConfig, shouldSkipComment } from './commentFilters';

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
});
