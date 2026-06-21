import { CronJob, validateCronExpression } from 'cron';
import crypto from 'crypto';
import logger from '../config/logger';

type ScheduledJob = {
  id: string;
  accountKey: string;
  cronTime: string;
  url: string;
  caption: string;
  job: CronJob;
  createdAt: string;
};

const scheduledJobs = new Map<string, ScheduledJob>();

export type ScheduledPostInfo = {
  id: string;
  accountKey: string;
  cronTime: string;
  url: string;
  caption: string;
  createdAt: string;
};

export function schedulePostJob(
  accountKey: string,
  cronTime: string,
  url: string,
  caption: string,
  onFire: () => Promise<void>
): string {
  const validation = validateCronExpression(cronTime);
  if (!validation.valid) {
    throw new Error(validation.error?.message || 'Invalid cron expression');
  }

  for (const [id, entry] of scheduledJobs) {
    if (entry.accountKey === accountKey && entry.cronTime === cronTime && entry.url === url) {
      entry.job.stop();
      scheduledJobs.delete(id);
    }
  }

  const id = crypto.randomUUID();
  const job = new CronJob(
    cronTime,
    () => {
      void (async () => {
        try {
          await onFire();
          logger.info(`Scheduled post ${id} completed for account ${accountKey}`);
        } catch (error) {
          logger.error(`Scheduled post ${id} failed:`, error);
        } finally {
          job.stop();
          scheduledJobs.delete(id);
        }
      })();
    },
    null,
    true
  );

  scheduledJobs.set(id, {
    id,
    accountKey,
    cronTime,
    url,
    caption,
    job,
    createdAt: new Date().toISOString(),
  });

  logger.info(`Scheduled post ${id} for account ${accountKey} at ${cronTime}`);
  return id;
}

export function cancelScheduledPost(jobId: string): boolean {
  const entry = scheduledJobs.get(jobId);
  if (!entry) return false;
  entry.job.stop();
  scheduledJobs.delete(jobId);
  return true;
}

export function listScheduledPosts(accountKey?: string): ScheduledPostInfo[] {
  return [...scheduledJobs.values()]
    .filter((entry) => !accountKey || entry.accountKey === accountKey)
    .map(({ id, accountKey: key, cronTime, url, caption, createdAt }) => ({
      id,
      accountKey: key,
      cronTime,
      url,
      caption,
      createdAt,
    }));
}

export function stopAllScheduledPosts(accountKey?: string): void {
  for (const [id, entry] of scheduledJobs) {
    if (!accountKey || entry.accountKey === accountKey) {
      entry.job.stop();
      scheduledJobs.delete(id);
    }
  }
}
