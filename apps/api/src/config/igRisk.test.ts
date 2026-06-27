import {
  getDowngradedProfileName,
  recordIgChallenge,
  getRecentChallengeCount,
  resetIgRiskState,
} from './igRisk';

describe('igRisk', () => {
  beforeEach(async () => {
    await resetIgRiskState();
  });

  afterEach(async () => {
    await resetIgRiskState();
  });

  test('getDowngradedProfileName leaves profile when no challenges', () => {
    expect(getDowngradedProfileName('aggressive', 0)).toBe('aggressive');
    expect(getDowngradedProfileName('standard', 0)).toBe('standard');
  });

  test('getDowngradedProfileName downgrades one step after challenge', () => {
    expect(getDowngradedProfileName('aggressive', 1)).toBe('standard');
    expect(getDowngradedProfileName('standard', 2)).toBe('safe');
  });

  test('getDowngradedProfileName forces safe after 3+ challenges', () => {
    expect(getDowngradedProfileName('aggressive', 3)).toBe('safe');
  });

  test('recordIgChallenge increments recent count', async () => {
    expect(await getRecentChallengeCount()).toBe(0);
    await recordIgChallenge('test-challenge');
    expect(await getRecentChallengeCount()).toBe(1);
  });
});
