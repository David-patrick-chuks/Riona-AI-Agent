import {
  getDowngradedProfileName,
  recordIgChallenge,
  getRecentChallengeCount,
  resetIgRiskState,
  getIgRiskSummary,
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

  test('getIgRiskSummary reflects configured and effective profiles', async () => {
    await recordIgChallenge('challenge-1');
    const summary = await getIgRiskSummary('aggressive');
    expect(summary).toEqual({
      configuredProfile: 'aggressive',
      effectiveProfile: 'standard',
      challengesLast24h: 1,
    });
  });

  test('prunes events older than 24 hours from challenge count', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const riskPath = path.join(__dirname, '../data/igRiskState.json');
    await fs.mkdir(path.dirname(riskPath), { recursive: true });
    await fs.writeFile(
      riskPath,
      JSON.stringify({
        events: [
          { at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), reason: 'old' },
          { at: new Date().toISOString(), reason: 'recent' },
        ],
      }),
    );

    expect(await getRecentChallengeCount()).toBe(1);
  });
});
