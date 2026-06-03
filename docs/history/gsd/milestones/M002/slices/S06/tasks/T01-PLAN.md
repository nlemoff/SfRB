---
estimated_steps: 4
estimated_files: 5
---

# T01: Define the canonical reconciliation action and no-write diagnostics

**Slice:** S06 — Mode Reconciliation & Layout Policies
**Milestone:** M002

## Description

Start at the shared truth boundary. S06 cannot retire R012 with shell copy alone because the current codebase still treats mode switching as a browser-local lens flip. This task should define the smallest canonical reconciliation contract that persists an inspectable outcome for leaving Freeform and returning to structured behavior, while keeping the active lens itself browser-local.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the current editor action union, bridge request/response shape, and validation constraints to identify the minimal place to add a reconciliation action/result without violating document-vs-design physics.
2. Add a shared reconciliation action in `src/editor/actions.ts` for the meaningful Freeform exit outcomes S06 needs, including explicit policy choices for keeping a composition locked versus rejoining structured layout logic, and keep invalid/unsupported requests as no-write failures with actionable diagnostics.
3. Mirror the payload/result shape through `web/src/bridge-client.ts` and `src/bridge/server.mjs` so browser and future CLI callers see the same canonical contract and returned action/result metadata.
4. Extend the document and bridge tests to cover successful reconciliation, rejected reconciliation, and byte-stable bootstrap/disk behavior on no-write paths.

## Must-Haves

- [ ] The active lens remains browser-local; only the meaningful reconciliation outcome is added to the canonical contract.
- [ ] The new reconciliation action/result respects the existing validation boundary, including the fact that design workspaces still require frames/groups invariants and document workspaces still cannot silently absorb them.
- [ ] Invalid reconciliation choices expose inspectable diagnostics and do not mutate `resume.sfrb.json`.

## Verification

- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`

## Observability Impact

- Signals added/changed: canonical reconciliation action kind/result, policy choice, and no-write diagnostics for invalid or blocked reconciliation.
- How a future agent inspects this: read `src/editor/actions.ts` and `src/bridge/server.mjs`, or run the document/bridge tests and inspect `/__sfrb/editor` responses.
- Failure state exposed: unsupported reconciliation paths, invalid frame/group targets, and policy/validation mismatches become visible before the browser shell is involved.

## Inputs

- `src/editor/actions.ts` — existing S02/S03/S04/S05 canonical mutation contract.
- `web/src/bridge-client.ts` — browser mirror of the `/__sfrb/editor` action surface.
- `src/bridge/server.mjs` — current action/document write seam that persists canonical state.
- `tests/document/editor-actions.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` — existing contract proof pattern for success and no-write failure behavior.
- `S06-RESEARCH.md` and decisions D024/D033/D036 — constraints that lens choice stays browser-local, reconciliation must be explicit, and freeform must preserve group invariants.

## Expected Output

- `src/editor/actions.ts` — a minimal canonical reconciliation action/result with diagnostics for invalid/no-write requests.
- `web/src/bridge-client.ts` and `src/bridge/server.mjs` — browser and bridge support for the shared reconciliation payload/result.
- `tests/document/editor-actions.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` — proof that reconciliation is persisted when valid and rejected without write drift when invalid.
