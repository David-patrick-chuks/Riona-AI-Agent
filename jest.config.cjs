module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': './jest.ts-transformer.cjs',
  },
  modulePathIgnorePatterns: ['<rootDir>/build'],
  setupFiles: ['<rootDir>/src/test/setup.ts'],
};
