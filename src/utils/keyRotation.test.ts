const loadUtils = () => {
  jest.resetModules();
  return require('./index');
};

describe('getNextApiKey', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('throws when no keys are configured', () => {
    delete process.env.GEMINI_API_KEY;
    const { getNextApiKey } = loadUtils();
    expect(() => getNextApiKey(0)).toThrow(/No valid GEMINI API keys/);
  });

  test('rotates when multiple keys exist', () => {
    process.env.GEMINI_API_KEY_1 = 'key1';
    process.env.GEMINI_API_KEY_2 = 'key2';
    const { getNextApiKey } = loadUtils();
    const next = getNextApiKey(0);
    expect(next).toBe('key2');
  });
});
