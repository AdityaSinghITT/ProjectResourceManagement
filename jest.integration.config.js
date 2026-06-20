/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/*.integration.test.ts'],
  testPathIgnorePatterns: [],
  testTimeout: 120000,
  maxWorkers: 1,
};
