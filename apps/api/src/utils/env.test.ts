import { getBoolEnv, getNumberEnv } from './env';

describe('env helpers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('getBoolEnv parses true values', () => {
    process.env.FLAG = 'true';
    expect(getBoolEnv('FLAG', false)).toBe(true);
    process.env.FLAG = '1';
    expect(getBoolEnv('FLAG', false)).toBe(true);
  });

  test('getBoolEnv falls back to default', () => {
    delete process.env.FLAG;
    expect(getBoolEnv('FLAG', true)).toBe(true);
  });

  test('getNumberEnv parses numbers and defaults', () => {
    process.env.COUNT = '42';
    expect(getNumberEnv('COUNT', 1)).toBe(42);
    process.env.COUNT = 'nope';
    expect(getNumberEnv('COUNT', 5)).toBe(5);
  });
});
