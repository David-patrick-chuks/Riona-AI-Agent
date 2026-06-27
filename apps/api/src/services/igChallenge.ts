import logger from '../config/logger';
import { getNumberEnv } from '../utils/env';
import { setIgCooldown } from '../utils';
import { logAction } from './actionLog';
import { recordIgChallenge, getIgRiskSummary } from '../config/igRisk';
import { getIgProfile } from '../config/igProfile';
import { triggerWebhooks } from './webhooks';

export type IgChallengeInput = {
  account: string;
  username?: string;
  reason: string;
  url?: string;
  details?: Record<string, unknown>;
};

/**
 * Escalate an Instagram challenge/login block: record risk, cooldown, log, webhook.
 */
export const handleIgChallenge = async (input: IgChallengeInput): Promise<void> => {
  const cooldownMinutes = getNumberEnv('IG_COOLDOWN_MINUTES', 60);
  await recordIgChallenge(input.reason);
  await setIgCooldown(cooldownMinutes);

  const risk = await getIgRiskSummary(getIgProfile().name);

  logger.warn(
    `IG challenge escalation [${input.account}]: ${input.reason} — cooldown ${cooldownMinutes}m, effective profile ${risk.effectiveProfile}`,
  );

  await logAction({
    platform: 'instagram',
    action: 'challenge',
    status: 'error',
    account: input.account,
    username: input.username,
    error: input.reason,
    details: {
      url: input.url,
      cooldownMinutes,
      ...risk,
      ...input.details,
    },
  });

  try {
    await triggerWebhooks(
      'action.error',
      {
        type: 'instagram_challenge',
        reason: input.reason,
        url: input.url,
        account: input.account,
        username: input.username,
        cooldownMinutes,
        ...risk,
      },
      input.account,
    );
  } catch (error) {
    logger.warn('Webhook trigger failed during IG challenge escalation:', error);
  }
};
