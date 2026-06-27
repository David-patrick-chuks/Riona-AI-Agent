import fs from 'fs/promises';
import path from 'path';
import type { IgProfile } from './igProfile';

export type IgRiskState = {
  events: Array<{ at: string; reason: string }>;
};

const RISK_PATH = path.join(__dirname, '../data/igRiskState.json');
const PROFILE_ORDER: IgProfile['name'][] = ['safe', 'standard', 'aggressive'];

const readState = async (): Promise<IgRiskState> => {
  try {
    const raw = await fs.readFile(RISK_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as IgRiskState;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return { events: [] };
  }
};

const writeState = async (state: IgRiskState): Promise<void> => {
  await fs.mkdir(path.dirname(RISK_PATH), { recursive: true });
  await fs.writeFile(RISK_PATH, JSON.stringify(state, null, 2));
};

/** Challenge events in the last 24 hours */
export const getRecentChallengeCount = async (): Promise<number> => {
  const state = await readState();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return state.events.filter((e) => new Date(e.at).getTime() >= cutoff).length;
};

export const recordIgChallenge = async (reason: string): Promise<number> => {
  const state = await readState();
  state.events.push({ at: new Date().toISOString(), reason });
  // Keep last 50 events
  if (state.events.length > 50) {
    state.events = state.events.slice(-50);
  }
  await writeState(state);
  return state.events.length;
};

export const getDowngradedProfileName = (
  configured: IgProfile['name'],
  challengeCount24h: number,
): IgProfile['name'] => {
  const idx = PROFILE_ORDER.indexOf(configured);
  const safeIdx = idx >= 0 ? idx : PROFILE_ORDER.indexOf('standard');
  const steps = challengeCount24h >= 3 ? 2 : challengeCount24h >= 1 ? 1 : 0;
  return PROFILE_ORDER[Math.max(0, safeIdx - steps)];
};

export const getIgRiskSummary = async (
  configuredProfile: IgProfile['name'],
): Promise<{
  configuredProfile: IgProfile['name'];
  effectiveProfile: IgProfile['name'];
  challengesLast24h: number;
}> => {
  const challengesLast24h = await getRecentChallengeCount();
  return {
    configuredProfile,
    effectiveProfile: getDowngradedProfileName(configuredProfile, challengesLast24h),
    challengesLast24h,
  };
};

/** Reset risk state (tests) */
export const resetIgRiskState = async (): Promise<void> => {
  try {
    await fs.unlink(RISK_PATH);
  } catch {
    // ignore
  }
};
