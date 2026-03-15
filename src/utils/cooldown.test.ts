import { getIgCooldown, setIgCooldown } from './index';

describe('IG cooldown', () => {
  test('setIgCooldown sets a future timestamp', async () => {
    await setIgCooldown(1);
    const cd = await getIgCooldown();
    expect(cd.until).toBeGreaterThan(Date.now());
  });
});
