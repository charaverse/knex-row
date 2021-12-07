/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/node_modules", "<rootDir>/dist"],
  watchPathIgnorePatterns: ["<rootDir>/dist"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
