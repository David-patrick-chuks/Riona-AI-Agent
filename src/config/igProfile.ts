import { getNumberEnv } from '../utils/env';

/**
 * Instagram automation profile configuration
 */
export type IgProfile = {
  /** Profile name: safe, standard, or aggressive */
  name: 'safe' | 'standard' | 'aggressive';
  /** Interval between agent runs in milliseconds */
  intervalMs: number;
  /** Maximum number of actions per day */
  dailyMaxActions: number;
  /** Maximum number of posts per run */
  maxPostsPerRun: number;
  /** Minimum delay between actions in milliseconds */
  minDelayMs: number;
  /** Maximum delay between actions in milliseconds */
  maxDelayMs: number;
};

/** Predefined Instagram profiles with their default settings */
const PROFILES: Record<IgProfile['name'], IgProfile> = {
  safe: {
    name: 'safe',
    intervalMs: 60_000,
    dailyMaxActions: 50,
    maxPostsPerRun: 8,
    minDelayMs: 10_000,
    maxDelayMs: 20_000,
  },
  standard: {
    name: 'standard',
    intervalMs: 30_000,
    dailyMaxActions: 120,
    maxPostsPerRun: 20,
    minDelayMs: 5_000,
    maxDelayMs: 10_000,
  },
  aggressive: {
    name: 'aggressive',
    intervalMs: 15_000,
    dailyMaxActions: 250,
    maxPostsPerRun: 30,
    minDelayMs: 3_000,
    maxDelayMs: 7_000,
  },
};

/**
 * Gets the Instagram profile configuration, combining profile defaults with environment variable overrides
 * @returns The Instagram profile configuration
 */
export const getIgProfile = (): IgProfile => {
  const raw = (process.env.IG_RUN_PROFILE || 'standard').toLowerCase();
  const base = (PROFILES as any)[raw] || PROFILES.standard;

  return {
    ...base,
    intervalMs: getNumberEnv('IG_AGENT_INTERVAL_MS', base.intervalMs),
    dailyMaxActions: getNumberEnv('IG_DAILY_MAX_ACTIONS', base.dailyMaxActions),
    maxPostsPerRun: getNumberEnv('IG_MAX_POSTS_PER_RUN', base.maxPostsPerRun),
    minDelayMs: getNumberEnv('IG_ACTION_DELAY_MIN_MS', base.minDelayMs),
    maxDelayMs: getNumberEnv('IG_ACTION_DELAY_MAX_MS', base.maxDelayMs),
  };
};
