---
id: T01
parent: S05
milestone: M001
provides:
  - Bridge-owned consultant request contract that resolves workspace BYOK config + env secrets into validated resize proposals or sanitized consultant failures without writing the canonical document.
key_files:
  - src/agent/LayoutConsultant.ts
  - src/bridge/server.mjs
  - web/src/bridge-client.ts
  - tests/bridge/bridge-layout-consultant-contract.test.ts
  - tests/utils/bridge-browser.ts
key_decisions:
  - D021: keep provider calls and raw responses inside the bridge, and expose only categorized consultant codes plus safe proposal payloads.
patterns_established:
  - Consultant requests post only frame-local issue context to /__sfrb/consultant; the bridge reloads the canonical document, resolves the configured env-var secret, validates provider output locally, and never mutates resume.sfrb.json.
observability_surfaces:
  - /__sfrb/consultant response codes/payloads
  - tests/bridge/bridge-layout-consultant-contract.test.ts
  - bridge consultant error codes and proposal validation issues
duration: 1h10m
verification_result: passed
completed_at: 2026-03-14T03:20:00-07:00
blocker_discovered: false
---

# T01: Add the bridge-backed consultant contract and provider safety boundary

**Added a bridge-only layout consultant route plus provider adapter/validation layer that returns safe resize proposals or inspectable sanitized failures without touching the canonical document.**

## What Happened

I added `src/agent/LayoutConsultant.ts` as the provider-backed consultant service. It owns the narrow request schema (`frameId` + overflow measurements), the structured resize proposal schema, provider adapters for OpenAI/Anthropic, provider-output parsing, and local safety validation that rejects proposals targeting the wrong frame or overflowing page bounds.

I then wired `src/bridge/server.mjs` with a dedicated `POST /__sfrb/consultant` route. That route reads `sfrb.config.json`, resolves the actual secret from `process.env`, rejects missing config/secret state before any provider call, loads the canonical document from disk, and returns only typed proposal payloads or categorized failures (`configuration_missing`, `provider_unavailable`, `malformed_provider_output`, `proposal_rejected`, etc.). It does not return raw upstream responses or secret values, and it does not write `resume.sfrb.json`.

On the browser side, I extended `web/src/bridge-client.ts` with `BRIDGE_LAYOUT_CONSULTANT_PATH`, typed consultant request/result shapes, and `requestBridgeLayoutConsultant()` so T02 can consume the route without reimplementing fetch contracts.

For verification coverage, I added `tests/bridge/bridge-layout-consultant-contract.test.ts` and extended `tests/utils/bridge-browser.ts` with consultant POST helpers plus env overrides for spawned bridge processes. The contract test exercises:
- successful proposal responses with stable payload shape
- missing-secret failure surfaced as `configuration_missing`
- provider-unavailable failure surfaced as `provider_unavailable`
- malformed provider output surfaced as `malformed_provider_output`
- unsupported provider surfaced by the consultant service as `provider_unsupported`
- unchanged `resume.sfrb.json` bytes across consultant-only success and failure paths

I also appended D021 to `.gsd/DECISIONS.md` because this task establishes the reusable bridge/provider boundary for the rest of S05.

## Verification

Passed:
- `npm test -- --run tests/bridge/bridge-layout-consultant-contract.test.ts`
  - Verified success payload shape from `/__sfrb/consultant`
  - Verified distinct missing-secret, provider-unavailable, malformed-output, and unsupported-provider outcomes
  - Verified consultant requests do not mutate `resume.sfrb.json` on success or failure
  - Verified consultant responses do not expose API secret values or raw upstream error text

Slice-level checks run during this task:
- `npm test -- --run tests/web/editor-layout-consultant.test.ts` → failed as expected because `tests/web/editor-layout-consultant.test.ts` does not exist yet (owned by T02/T03)
- `node scripts/verify-s05-layout-consultant.mjs` → failed as expected because `scripts/verify-s05-layout-consultant.mjs` does not exist yet (owned by T03)

Not run yet:
- Built-path failure browser check from the slice plan; deferred to T03 when the UI flow and standalone verification script exist

## Diagnostics

Later agents can inspect the shipped boundary via:
- `POST /__sfrb/consultant` for direct consultant contract responses
- `tests/bridge/bridge-layout-consultant-contract.test.ts` for executable happy/failure-path coverage
- consultant response fields `code`, `status`, `provider`, `apiKeyEnvVar`, and `issues` for actionable failure inspection

The bridge intentionally redacts raw provider payloads and never serializes the resolved API secret back to the browser.

## Deviations

None.

## Known Issues

- `tests/web/editor-layout-consultant.test.ts` is still pending T02/T03 implementation.
- `scripts/verify-s05-layout-consultant.mjs` is still pending T03 implementation.

## Files Created/Modified

- `src/agent/LayoutConsultant.ts` — new consultant service with provider adapters, request/proposal schemas, and local proposal safety validation.
- `src/bridge/server.mjs` — added `/__sfrb/consultant`, config/env resolution, and sanitized consultant failure mapping.
- `web/src/bridge-client.ts` — added typed consultant request/result helpers for browser consumers.
- `tests/bridge/bridge-layout-consultant-contract.test.ts` — added executable consultant contract coverage for success + failure paths + no-write guarantees.
- `tests/utils/bridge-browser.ts` — added consultant route test helpers and spawned-bridge env overrides.
- `.gsd/DECISIONS.md` — recorded D021 for the bridge-owned provider/safety boundary.
- `.gsd/milestones/M001/slices/S05/S05-PLAN.md` — marked T01 complete.
