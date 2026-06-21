import fs from 'fs/promises';
import path from 'path';
import {
  Instagram_cookiesExist,
  getIgDailyState,
  getInstagramCookiesPath,
  incrementIgDailyCount,
  loadCookies,
  sanitizeAccountKey,
} from './index';

describe('utils', () => {
  const cookiesDir = path.join(process.cwd(), 'cookies');
  const cookiesPath = path.join(cookiesDir, 'Instagramcookies.json');
  const dataPath = path.join(__dirname, '../data/igActionData.json');
  const extraCookiePaths: string[] = [];

  afterEach(async () => {
    try { await fs.unlink(cookiesPath); } catch {}
    for (const p of extraCookiePaths.splice(0)) {
      try { await fs.unlink(p); } catch {}
    }
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

  test('getInstagramCookiesPath uses default file for default account', () => {
    expect(getInstagramCookiesPath('default')).toBe(cookiesPath);
  });

  test('getInstagramCookiesPath uses per-account file for non-default accounts', () => {
    expect(getInstagramCookiesPath('alt')).toBe(
      path.join(cookiesDir, 'Instagramcookies.alt.json')
    );
  });

  test('sanitizeAccountKey strips unsafe characters', () => {
    expect(sanitizeAccountKey('my account!')).toBe('my_account_');
  });

  test('Instagram_cookiesExist is scoped per account', async () => {
    await fs.mkdir(cookiesDir, { recursive: true });
    const altPath = getInstagramCookiesPath('alt');
    extraCookiePaths.push(altPath);
    const future = Math.floor(Date.now() / 1000) + 3600;

    await fs.writeFile(
      altPath,
      JSON.stringify([{ name: 'sessionid', value: 'abc', expires: future }]),
      'utf-8'
    );

    expect(await Instagram_cookiesExist('alt')).toBe(true);
    expect(await Instagram_cookiesExist('default')).toBe(false);
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
