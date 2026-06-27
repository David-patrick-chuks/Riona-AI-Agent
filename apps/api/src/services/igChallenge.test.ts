jest.mock('../utils', () => ({
  setIgCooldown: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./actionLog', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/igRisk', () => ({
  recordIgChallenge: jest.fn().mockResolvedValue(1),
  getIgRiskSummary: jest.fn().mockResolvedValue({
    configuredProfile: 'standard',
    effectiveProfile: 'safe',
    challengesLast24h: 2,
  }),
}));

jest.mock('../config/igProfile', () => ({
  getIgProfile: jest.fn(() => ({ name: 'standard' })),
}));

jest.mock('./webhooks', () => ({
  triggerWebhooks: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { handleIgChallenge } from './igChallenge';
import { setIgCooldown } from '../utils';
import { logAction } from './actionLog';
import { recordIgChallenge, getIgRiskSummary } from '../config/igRisk';
import { triggerWebhooks } from './webhooks';
import logger from '../config/logger';

describe('handleIgChallenge', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.IG_COOLDOWN_MINUTES = '45';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('records risk, sets cooldown, logs action, and fires webhook', async () => {
    await handleIgChallenge({
      account: 'default',
      username: 'testuser',
      reason: 'checkpoint_required',
      url: 'https://instagram.com/challenge',
      details: { code: 'CHALLENGE' },
    });

    expect(recordIgChallenge).toHaveBeenCalledWith('checkpoint_required');
    expect(setIgCooldown).toHaveBeenCalledWith(45);
    expect(getIgRiskSummary).toHaveBeenCalledWith('standard');
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'instagram',
        action: 'challenge',
        status: 'error',
        account: 'default',
        username: 'testuser',
        error: 'checkpoint_required',
        details: expect.objectContaining({
          url: 'https://instagram.com/challenge',
          effectiveProfile: 'safe',
          code: 'CHALLENGE',
        }),
      }),
    );
    expect(triggerWebhooks).toHaveBeenCalledWith(
      'action.error',
      expect.objectContaining({
        type: 'instagram_challenge',
        reason: 'checkpoint_required',
        account: 'default',
        cooldownMinutes: 45,
      }),
      'default',
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  test('uses default cooldown when IG_COOLDOWN_MINUTES is unset', async () => {
    delete process.env.IG_COOLDOWN_MINUTES;

    await handleIgChallenge({
      account: 'acct-2',
      reason: 'suspicious_login',
    });

    expect(setIgCooldown).toHaveBeenCalledWith(60);
  });

  test('continues when webhook trigger fails', async () => {
    (triggerWebhooks as jest.Mock).mockRejectedValueOnce(new Error('webhook down'));

    await expect(
      handleIgChallenge({
        account: 'default',
        reason: 'challenge',
      }),
    ).resolves.toBeUndefined();

    expect(logAction).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Webhook trigger failed during IG challenge escalation:',
      expect.any(Error),
    );
  });
});
