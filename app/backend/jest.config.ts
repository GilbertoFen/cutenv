import type { Config } from 'jest';
const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    moduleFileExtensions: ['ts', 'js', 'json'],
    testMatch: ['<rootDir>/(test|src)/**/*.spec.ts'],
    setupFiles: ['<rootDir>/test/jest.setup.env.ts'],
     moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',   // 👈 alias "src/*"
  },
}
export default config;