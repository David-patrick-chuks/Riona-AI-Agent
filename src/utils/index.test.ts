import fs from 'fs/promises';
import path from 'path';
import { Instagram_cookiesExist, getIgDailyState, incrementIgDailyCount, loadCookies } from './index';

describe('utils', () => {
  const cookiesDir = path.join(process.cwd(), 'cookies');
  const cookiesPath = path.join(cookiesDir, 'Instagramcookies.json');
  const dataPath = path.join(__dirname, '../data/igActionData.json');

  afterEach(async () => {
    try { await fs.unlink(cookiesPath); } catch {}
    try {
      const files = await fs.readdir(cookiesDir);
      for (const file of files) {
        if (file.startsWith('Instagramcookies.corrupt-')) {
          await fs.unlink(path.join(cookiesDir, file));
        }
      }
    } catch {}
    try { await fs.unlink(dataPath); } catch {}
  });

  test('daily IG action counter increments', async () => {
    const initial = await getIgDailyState();
    expect(initial.count).toBe(0);

    await incrementIgDailyCount(2);
    const updated = await getIgDailyState();
    expect(updated.count).toBeGreaterThanOrEqual(2);
  });

  test('invalid cookies JSON is backed up and treated as missing', async () => {
    await fs.mkdir(cookiesDir, { recursive: true });
    await fs.writeFile(cookiesPath, '{"bad_json":', 'utf-8');

    const exists = await Instagram_cookiesExist();
    expect(exists).toBe(false);

    const files = await fs.readdir(cookiesDir);
    const backup = files.find((f) => f.startsWith('Instagramcookies.corrupt-'));
    expect(backup).toBeTruthy();
  });

  test('loadCookies returns [] for invalid JSON and backs up file', async () => {
    await fs.mkdir(cookiesDir, { recursive: true });
    await fs.writeFile(cookiesPath, '{"bad_json":', 'utf-8');

    const cookies = await loadCookies(cookiesPath);
    expect(cookies).toEqual([]);

    const files = await fs.readdir(cookiesDir);
    const backup = files.find((f) => f.startsWith('Instagramcookies.corrupt-'));
    expect(backup).toBeTruthy();
  });
});
