# Testing Strategy

SfRB uses [Vitest](https://vitest.dev) for unit, contract, and browser tests.

## Test layers

- **Unit tests** — pure logic (schema, validation, config, utils). Fast and isolated.
- **Contract tests** (`tests/bridge/`) — spawn the built bridge and exercise the HTTP contract end-to-end, including the canonical write path, the AI consultant boundary, and the health/metrics endpoints.
- **Browser tests** (`tests/web/`) — drive the real editor in Chromium via Playwright.

## Running tests

```bash
npm test                              # full suite
npm run test:web                      # browser tests only (needs Chromium)
npx vitest run path/to/file.test.ts   # a single file
npx vitest run -t "name fragment"     # filter by test name
npm run coverage                      # suite + coverage thresholds
```

One-time browser setup: `npm run test:setup:browsers`.

## Isolation

Tests run in the `forks` pool with per-file isolation and file parallelism enabled, so tests cannot leak state into one another. Contract and browser tests create throwaway temp workspaces and tear them down afterward.

## Coverage thresholds

`npm run coverage` enforces minimum coverage on `src/` (the in-process CLI/document/config/utils code). The bridge runtime and browser code run in separate processes and are validated by contract and browser tests rather than line coverage. Thresholds are configured in `vitest.config.ts`; raise them as coverage improves rather than lowering them to pass.

## Flaky-test mitigation

On CI, tests retry up to twice (`retry: 2`) to tolerate environmental nondeterminism (browser/network startup) without masking deterministic failures. Locally, retries are disabled so flakiness is visible during development. A test that only passes on retry should be treated as a bug to fix, not a result to rely on.

## Test performance tracking

On CI, Vitest emits a JUnit report (`reports/junit.xml`) with per-test timing, uploaded as a build artifact. Use it to spot slow or regressing tests over time.

## The clean-stdio contract

The bridge must not write to stderr during normal operation. Contract tests assert `stderr` is empty after exercising the bridge. Keep the shared logger silent by default and route diagnostics through it (gated on `SFRB_LOG_LEVEL`).
