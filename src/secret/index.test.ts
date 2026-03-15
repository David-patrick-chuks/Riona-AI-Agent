const loadKeys = () => {
  jest.resetModules();
  return require('./index');
};

describe('geminiApiKeys', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('uses primary key first and filters placeholders', () => {
    process.env.GEMINI_API_KEY = 'primary-key';
    process.env.GEMINI_API_KEY_1 = 'API_KEY_1';
    process.env.GEMINI_API_KEY_2 = 'real-key-2';

    const { geminiApiKeys } = loadKeys();
    expect(geminiApiKeys).toEqual(['primary-key', 'real-key-2']);
  });

  test('collects numbered keys in order', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY_2 = 'key2';
    process.env.GEMINI_API_KEY_1 = 'key1';

    const { geminiApiKeys } = loadKeys();
    expect(geminiApiKeys).toEqual(['key1', 'key2']);
  });
});
