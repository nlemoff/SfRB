import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['tests/utils/global-setup.ts'],
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
      '**/docs/history/**',
      '**/.gsd/**',
    ],
  },
});
