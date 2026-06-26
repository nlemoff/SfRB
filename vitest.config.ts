import process from 'node:process';

import { defineConfig } from 'vitest/config';

const isCI = process.env.CI === 'true' || process.env.CI === '1';

export default defineConfig({
  test: {
    globalSetup: ['tests/utils/global-setup.ts'],
    retry: isCI ? 2 : 0,
    reporters: isCI ? ['default', 'junit'] : 'default',
    outputFile: isCI ? { junit: 'reports/junit/vitest.xml' } : undefined,
    // Most suites spawn a real Vite bridge + Chromium; uncapped parallelism on
    // high-core machines starves them into timeout flakes. Four matches the CI
    // runner profile this suite is known to be stable on.
    maxWorkers: 4,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'tests/**', 'dist/**'],
      thresholds: {
        lines: 50,
        statements: 50,
        functions: 70,
        branches: 75,
      },
    },
  },
});
