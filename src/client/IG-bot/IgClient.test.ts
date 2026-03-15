jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn(),
}));

jest.mock('puppeteer-extra-plugin-stealth', () => () => ({}));

jest.mock('puppeteer-extra-plugin-adblocker', () => () => ({}));

jest.mock('puppeteer', () => ({
  DEFAULT_INTERCEPT_RESOLUTION_PRIORITY: 0,
}));

import { IgClient } from './IgClient';

describe('IgClient', () => {
  test('isSponsoredInArticle returns false when page is not initialized', async () => {
    const client = new IgClient();
    (client as any).page = null;

    const result = await (client as any).isSponsoredInArticle(1);
    expect(result).toEqual({ sponsored: false });
  });

  test('isSponsoredInArticle returns evaluate result', async () => {
    const client = new IgClient();
    const evaluate = jest.fn().mockResolvedValue({ sponsored: true, reason: "marker:sponsored" });
    (client as any).page = { evaluate };

    const result = await (client as any).isSponsoredInArticle(3);
    expect(evaluate).toHaveBeenCalled();
    expect(result).toEqual({ sponsored: true, reason: "marker:sponsored" });
  });

  test('loginWithCredentials throws when credentials are missing', async () => {
    const client = new IgClient();
    (client as any).page = {};
    (client as any).browser = {};

    await expect((client as any).loginWithCredentials()).rejects.toThrow(
      /credentials are required/i
    );
  });

  test('isSponsoredInArticle passes custom marker lists from env', async () => {
    const client = new IgClient();
    const evaluate = jest.fn().mockResolvedValue({ sponsored: false });
    (client as any).page = { evaluate };
    process.env.IG_AD_MARKERS = 'reklam, promo';
    process.env.IG_AD_BUTTON_MARKERS = 'kup teraz, dowiedz sie wiecej';

    await (client as any).isSponsoredInArticle(2);

    const call = evaluate.mock.calls[0];
    expect(call[1]).toEqual(2);
    expect(call[2]).toEqual(['reklam', 'promo']);
    expect(call[3]).toEqual(['kup teraz', 'dowiedz sie wiecej']);

    delete process.env.IG_AD_MARKERS;
    delete process.env.IG_AD_BUTTON_MARKERS;
  });
});
