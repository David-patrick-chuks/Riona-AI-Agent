import fs from 'fs/promises';
import path from 'path';
import {
  Instagram_cookiesExist,
  getIgDailyState,
  incrementIgDailyCount,
  isCookieValid,
  loadCookies,
} from './index';

describe('utils', () => {
  const cookiesDir = path.join(process.cwd(), 'cookies');
  const cookiesPath = path.join(cookiesDir, 'Instagramcookies.json');
  const dataPath = path.join(__dirname, '../data/igActionData.json');

  afterEach(async () => {
    try {
      await fs.unlink(cookiesPath);
    } catch {
      /* ignore error */
    }
    try {
      const files = await fs.readdir(cookiesDir);
      for (const file of files) {
        if (file.startsWith('Instagramcookies.corrupt-')) {
          await fs.unlink(path.join(cookiesDir, file));
        }
      }
    } catch {
      /* ignore error */
    }
    try {
      await fs.unlink(dataPath);
    } catch {
      /* ignore error */
    }
  });

  test('daily IG action counter increments', async () => {
    const initial = await getIgDailyState();
    expect(initial.count).toBe(0);

    await incrementIgDailyCount(2);
    const updated = await getIgDailyState();
    expect(updated.count).toBeGreaterThanOrEqual(2);
  });

  test('session cookies without expires are treated as valid', async () => {
    await fs.mkdir(cookiesDir, { recursive: true });
    await fs.writeFile(
      cookiesPath,
      JSON.stringify([{ name: 'sessionid', value: 'abc123' }]),
      'utf-8',
    );

    const exists = await Instagram_cookiesExist();
    expect(exists).toBe(true);
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

  test('Instagram_cookiesExist accepts session cookies with expires -1', async () => {
    await fs.mkdir(cookiesDir, { recursive: true });
    await fs.writeFile(
      cookiesPath,
      JSON.stringify([{ name: 'sessionid', value: 'abc', expires: -1 }]),
      'utf-8',
    );

    expect(await Instagram_cookiesExist()).toBe(true);
  });

  test('Instagram_cookiesExist rejects expired timed cookies', async () => {
    await fs.mkdir(cookiesDir, { recursive: true });
    const past = Math.floor(Date.now() / 1000) - 3600;
    await fs.writeFile(
      cookiesPath,
      JSON.stringify([{ name: 'sessionid', value: 'abc', expires: past }]),
      'utf-8',
    );

    expect(await Instagram_cookiesExist()).toBe(false);
  });

  test('Instagram_cookiesExist accepts future timed cookies', async () => {
    await fs.mkdir(cookiesDir, { recursive: true });
    const future = Math.floor(Date.now() / 1000) + 3600;
    await fs.writeFile(
      cookiesPath,
      JSON.stringify([{ name: 'sessionid', value: 'abc', expires: future }]),
      'utf-8',
    );

    expect(await Instagram_cookiesExist()).toBe(true);
  });

  test('isCookieValid treats Puppeteer session cookies as valid', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isCookieValid({ name: 'sessionid', expires: -1 }, now)).toBe(true);
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
