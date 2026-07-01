import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { closeDB } from '../config/db';
import { getActionSummary, listActionLogs, listUnifiedActionLogs, logAction } from './actionLog';

describe('action log service', () => {
  const originalPath = process.env.ACTION_LOG_PATH;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'riona-action-log-'));
    process.env.ACTION_LOG_PATH = path.join(tempDir, 'actionLogs.json');
  });

  afterEach(async () => {
    process.env.ACTION_LOG_PATH = originalPath;
    await closeDB();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('writes and reads action logs from file fallback', async () => {
    await logAction({
      platform: 'instagram',
      action: 'login',
      status: 'success',
      account: 'default',
      username: 'riona',
    });

    const result = await listActionLogs({ limit: 10 });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].platform).toBe('instagram');
    expect(result.actions[0].action).toBe('login');
    expect(result.actions[0].status).toBe('success');
  });

  test('summarizes recent actions', async () => {
    await logAction({
      platform: 'instagram',
      action: 'login',
      status: 'success',
      account: 'default',
    });
    await logAction({
      platform: 'instagram',
      action: 'interact',
      status: 'error',
      account: 'default',
      error: 'challenge required',
    });

    const summary = await getActionSummary({ limit: 10 });
    expect(summary.total).toBe(2);
    expect(summary.success).toBe(1);
    expect(summary.error).toBe(1);
    expect(summary.byAction.login).toBe(1);
    expect(summary.byAction.interact).toBe(1);
  });

  test('concurrent file logs do not lose entries', async () => {
    await Promise.all([
      logAction({ platform: 'instagram', action: 'login', status: 'success', account: 'default' }),
      logAction({
        platform: 'instagram',
        action: 'interact',
        status: 'success',
        account: 'default',
      }),
      logAction({ platform: 'instagram', action: 'exit', status: 'success', account: 'default' }),
    ]);

    const result = await listActionLogs({ limit: 10 });
    expect(result.actions).toHaveLength(3);
    const actions = result.actions.map((entry) => entry.action).sort();
    expect(actions).toEqual(['exit', 'interact', 'login']);
  });

  test('filters action logs by status', async () => {
    await logAction({
      platform: 'instagram',
      action: 'login',
      status: 'success',
      account: 'default',
    });
    await logAction({
      platform: 'instagram',
      action: 'interact',
      status: 'error',
      account: 'default',
      error: 'challenge required',
    });

    const result = await listActionLogs({ limit: 10, status: 'error' });

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].action).toBe('interact');
    expect(result.actions[0].status).toBe('error');
  });

  describe('filtering', () => {
    beforeEach(async () => {
      // Create a set of test entries with different properties
      await logAction({
        platform: 'instagram',
        action: 'login',
        status: 'success',
        account: 'account1',
      });
      await logAction({
        platform: 'instagram',
        action: 'interact',
        status: 'error',
        account: 'account1',
        error: 'challenge required',
      });
      await logAction({
        platform: 'instagram',
        action: 'dm',
        status: 'success',
        account: 'account2',
      });
      await logAction({
        platform: 'twitter',
        action: 'post',
        status: 'error',
        account: 'account1',
        error: 'rate limit exceeded',
      });
    });

    test('filters by status', async () => {
      const errorResult = await listActionLogs({ status: 'error' });
      expect(errorResult.actions).toHaveLength(2);
      expect(errorResult.actions.every((a) => a.status === 'error')).toBe(true);

      const successResult = await listActionLogs({ status: 'success' });
      expect(successResult.actions).toHaveLength(2);
      expect(successResult.actions.every((a) => a.status === 'success')).toBe(true);
    });

    test('filters by action type', async () => {
      const result = await listActionLogs({ action: 'login' });
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].action).toBe('login');
    });

    test('filters by account', async () => {
      const result = await listActionLogs({ account: 'account2' });
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].account).toBe('account2');
    });

    test('filters by platform', async () => {
      const result = await listActionLogs({ platform: 'twitter' });
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].platform).toBe('twitter');
    });

    test('returns unified Instagram and Twitter actions with consistent metadata', async () => {
      const result = await listUnifiedActionLogs({ limit: 10 });

      expect(result.pagination.total).toBe(4);
      expect(result.actions).toHaveLength(4);
      expect(result.actions.map((entry) => entry.platform).sort()).toEqual([
        'instagram',
        'instagram',
        'instagram',
        'twitter',
      ]);
      expect(result.actions[0]).toEqual(
        expect.objectContaining({
          action: expect.any(String),
          timestamp: expect.any(String),
          status: expect.stringMatching(/success|error/),
          metadata: expect.any(Object),
        }),
      );
      expect(result.actions[0].metadata).toEqual(
        expect.objectContaining({
          sourceId: expect.any(String),
          account: expect.any(String),
        }),
      );
    });

    test('filters by error keyword', async () => {
      const result = await listActionLogs({ errorKeyword: 'challenge' });
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].error).toContain('challenge');
    });

    test('combines multiple filters', async () => {
      const result = await listActionLogs({
        platform: 'instagram',
        status: 'error',
      });
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].action).toBe('interact');
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      // Create 5 test entries
      for (let i = 1; i <= 5; i++) {
        await logAction({
          platform: 'instagram',
          action: `action${i}`,
          status: 'success',
          account: 'default',
        });
      }
    });

    test('returns pagination metadata', async () => {
      const result = await listActionLogs({ limit: 2 });
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.hasMore).toBe(true);
    });

    test('respects limit parameter', async () => {
      const result = await listActionLogs({ limit: 3 });
      expect(result.actions).toHaveLength(3);
    });

    test('respects offset parameter', async () => {
      const result = await listActionLogs({ limit: 2, offset: 2 });
      expect(result.actions).toHaveLength(2);
      expect(result.pagination.offset).toBe(2);
      expect(result.pagination.hasMore).toBe(true);
    });

    test('hasMore is false when no more results', async () => {
      const result = await listActionLogs({ limit: 10 });
      expect(result.pagination.hasMore).toBe(false);
    });

    test('sorts ascending when specified', async () => {
      const result = await listActionLogs({ sort: 'asc' });
      const actions = result.actions.map((a) => a.action);
      // First entry should be action1 (oldest) in ascending order
      expect(actions[0]).toBe('action1');
    });

    test('sorts descending by default', async () => {
      const result = await listActionLogs({ sort: 'desc' });
      const actions = result.actions.map((a) => a.action);
      // First entry should be action5 (newest) in descending order
      expect(actions[0]).toBe('action5');
    });
  });
});
