import { getIgProfile } from './igProfile';

describe('getIgProfile', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('defaults to standard profile', () => {
    delete process.env.IG_RUN_PROFILE;
    const profile = getIgProfile();
    expect(profile.name).toBe('standard');
  });

  test('uses safe profile and overrides', () => {
    process.env.IG_RUN_PROFILE = 'safe';
    process.env.IG_MAX_POSTS_PER_RUN = '5';
    process.env.IG_ACTION_DELAY_MIN_MS = '2000';
    process.env.IG_ACTION_DELAY_MAX_MS = '3000';

    const profile = getIgProfile();
    expect(profile.name).toBe('safe');
    expect(profile.maxPostsPerRun).toBe(5);
    expect(profile.minDelayMs).toBe(2000);
    expect(profile.maxDelayMs).toBe(3000);
  });

  test('unknown profile falls back to standard', () => {
    process.env.IG_RUN_PROFILE = 'weird';
    const profile = getIgProfile();
    expect(profile.name).toBe('standard');
  });
});
