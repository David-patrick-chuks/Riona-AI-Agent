import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { logAction } from './actionLog';
import { listAdminErrors, listAdminLogs } from './adminLogs';

describe('admin log service', () => {
  const originalLogsDir = process.env.LOGS_DIR;
  const originalActionLogPath = process.env.ACTION_LOG_PATH;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'riona-admin-logs-'));
    process.env.LOGS_DIR = tempDir;
    process.env.ACTION_LOG_PATH = path.join(tempDir, 'actionLogs.json');
  });

  afterEach(async () => {
    process.env.LOGS_DIR = originalLogsDir;
    process.env.ACTION_LOG_PATH = originalActionLogPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('reads recent application logs from log files', async () => {
    await fs.writeFile(
      path.join(tempDir, '2026-06-21-combined.log'),
      [
        JSON.stringify({
          level: 'info',
          message: 'server started',
          timestamp: '2026-06-21T10:00:00.000Z',
        }),
        JSON.stringify({
          level: 'error',
          message: 'login failed',
          timestamp: '2026-06-21T10:01:00.000Z',
        }),
      ].join('\n'),
    );

    const logs = await listAdminLogs({ limit: 5 });

    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe('error');
    expect(logs[0].message).toBe('login failed');
    expect(logs[1].level).toBe('info');
  });

  test('combines action errors and log errors', async () => {
    await fs.writeFile(
      path.join(tempDir, '2026-06-21-error.log'),
      `${JSON.stringify({
        level: 'error',
        message: 'uncaught exception',
        timestamp: '2026-06-21T10:02:00.000Z',
      })}\n`,
    );
    await logAction({
      platform: 'instagram',
      action: 'interact',
      status: 'error',
      account: 'default',
      error: 'challenge required',
    });

    const errors = await listAdminErrors({ limit: 10 });

    expect(errors).toHaveLength(2);
    expect(errors.map((entry) => entry.source).sort()).toEqual(['action', 'log']);
    expect(errors.some((entry) => entry.message === 'challenge required')).toBe(true);
    expect(errors.some((entry) => entry.message === 'uncaught exception')).toBe(true);
  });
});
