---
name: sfrb-contracts
description: Load-bearing contracts and verification commands for the SfRB resume builder. Use when modifying the bridge, document model, CLI, or web editor, or before opening a PR, to avoid breaking the canonical write path, secret handling, or the bridge's clean-stdio contract.
---

# SfRB contracts and verification

SfRB is a local-first, CLI-first resume editor. The `sfrb` CLI spawns a local Vite-backed HTTP bridge that serves a React editor. One canonical `resume.sfrb.json` is the only authoritative state.

## Do not break these contracts

1. **Canonical write path.** All document mutations go through `POST /__sfrb/editor`, which runs Zod schema + physics validation before writing `resume.sfrb.json`. Never write the document from the CLI or browser directly.
2. **Secrets stay bridge-side.** Provider API keys are read by the bridge from environment variables named in `sfrb.config.json`. Never put keys in committed config, the browser, or logs.
3. **Quiet bridge stdio.** The bridge must not write to stderr during normal operation (a contract test asserts this). Use the silent-by-default logger in `src/utils/logger.ts`; it emits only when `SFRB_LOG_LEVEL` is set.
4. **Zod-first.** Define the schema, infer the type, validate at boundaries.
5. **Build before running the bridge.** `src/bridge/server.mjs` loads compiled CJS from `dist/` via `createRequire`, so run `npm run build` after `src/` changes.
6. **Module boundaries.** Web code and bridge/server code must not import each other; cross only as validated HTTP payloads.

## Bridge HTTP surface

- `GET /__sfrb/bootstrap` — authoritative full state (browser reconciles here).
- `POST /__sfrb/editor` — the only mutation path.
- `POST /__sfrb/consultant` — AI overflow proposals (provider secrets/responses stay bridge-side).
- `GET /__sfrb/health` — readiness; `GET /__sfrb/metrics` — Prometheus text.
- Every `/__sfrb/*` response carries an `x-request-id`.

## Verify before finishing

```bash
npm run build
npm run typecheck
npm run lint
npm run format:check
npm run knip
npm run duplication
npm run check:tech-debt
npm run check:large-files
npm run schema:check
npm test            # or npm run coverage
```

## More detail

- Architecture: `docs/architecture.md`
- HTTP contract: `docs/bridge-api.md`
- Observability: `docs/observability.md`
- Testing: `docs/testing.md`
- Agent guide: `AGENTS.md`
