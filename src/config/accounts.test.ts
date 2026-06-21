import { parseAccountsMap } from './accounts';

describe('parseAccountsMap', () => {
  test('accepts valid account entries', () => {
    const map = parseAccountsMap({
      default: { username: ' user ', password: ' pass ' },
      alt: { username: 'alt_user', password: 'alt_pass' },
    });

    expect(map).toEqual({
      default: { username: 'user', password: 'pass' },
      alt: { username: 'alt_user', password: 'alt_pass' },
    });
  });

  test('skips entries with missing credentials', () => {
    const map = parseAccountsMap({
      default: { username: 'valid', password: 'secret' },
      broken: { username: '', password: 'x' },
      partial: { username: 'only_user' },
    });

    expect(map).toEqual({
      default: { username: 'valid', password: 'secret' },
    });
  });

  test('returns empty map for non-object input', () => {
    expect(parseAccountsMap(null)).toEqual({});
    expect(parseAccountsMap([])).toEqual({});
    expect(parseAccountsMap('bad')).toEqual({});
  });
});
