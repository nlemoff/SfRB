---
id: S05
parent: M001
milestone: M001
provides:
  - A bridge-backed AI layout consultant that detects design-mode overflow, returns validated resize proposals through a safe BYOK boundary, renders rejectable ghost previews, and persists accepted fixes through the canonical editor path with real-runtime proof.
requires:
  - slice: S04
    provides: The canonical `/__sfrb/bootstrap` + `/__sfrb/editor` reconciliation path, mode-aware editor surface, and design-mode frame editing foundation reused by the consultant workflow.
affects:
  - M002
key_files:
  - src/agent/LayoutConsultant.ts
  - src/bridge/server.mjs
  - web/src/bridge-client.ts
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - web/src/ui/GhostPreview.tsx
  - tests/bridge/bridge-layout-consultant-contract.test.ts
  - tests/web/editor-layout-consultant.test.ts
  - tests/utils/bridge-browser.ts
  - scripts/verify-s05-layout-consultant.mjs
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M001/M001-ROADMAP.md
key_decisions:
  - Keep provider calls and raw provider responses inside the bridge, exposing only validated resize proposals or sanitized consultant failures to the browser.
  - Measure overflow from the rendered design-frame body in Canvas, but keep consultant request/apply state in App so ghost preview geometry never becomes canonical before accept.
patterns_established:
  - Design-mode overflow is measured locally in the browser, proposed fixes are requested through `/__sfrb/consultant`, and accepted proposals persist only through the existing `/__sfrb/editor` validated write boundary.
  - Durable consultant proof uses canonical file bytes, bootstrap payloads, overflow-clear state, and preview visibility instead of transient UI status codes.
observability_surfaces:
  - `/__sfrb/bootstrap`
  - `/__sfrb/consultant`
  - `#consultant-panel[data-consultant-state][data-consultant-code]`
  - `#consultant-overflow-status[data-overflow-status]`
  - `#consultant-measurements[data-overflow-px]`
  - `#consultant-preview-state[data-preview-visible]`
  - `#consultant-frame-id[data-frame-id]`
  - `#consultant-rationale`
  - `#consultant-error`
  - `#bridge-payload-preview`
  - `tests/bridge/bridge-layout-consultant-contract.test.ts`
  - `tests/web/editor-layout-consultant.test.ts`
  - `scripts/verify-s05-layout-consultant.mjs`
drill_down_paths:
  - .gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T03-SUMMARY.md
duration: 3h+
verification_result: passed
completed_at: 2026-03-14 04:47 PDT
---

# S05: AI Layout Consultant

**Shipped a bridge-backed AI layout consultant that detects design-mode overflow, shows a rejectable ghost resize preview, and persists accepted fixes through the canonical local editor loop with real `dist/cli.js open` proof.**

## What Happened

S05 closed the last open milestone risk: structured AI layout mutation without losing the local-first canonical document model.

The slice started by creating a strict bridge-owned consultant boundary. `src/agent/LayoutConsultant.ts` now owns the narrow consultant request/proposal contract, provider adapters, provider-output parsing, and proposal safety validation. `src/bridge/server.mjs` exposes `POST /__sfrb/consultant`, resolves provider metadata from `sfrb.config.json`, reads the actual secret from `process.env`, reloads the canonical document from disk, validates proposed geometry, and returns only safe proposal payloads or categorized failures such as `configuration_missing`, `provider_unavailable`, `malformed_provider_output`, and `proposal_rejected`. That route never mutates `resume.sfrb.json`.

On the browser side, S05 extended the existing S04 shell instead of creating a parallel state model. `web/src/bridge-client.ts` gained typed consultant request/response helpers. `web/src/editor/Canvas.tsx` measures overflow from the rendered design-frame text region after settle, exposes stable overflow diagnostics, and mounts a ghost overlay layer. `web/src/App.tsx` owns consultant request/apply state, keeps preview geometry distinct from engine-local frame overrides, invalidates stale previews when the canonical payload changes underneath them, and routes accept through `/__sfrb/editor` by composing a candidate document from the canonical payload plus the proposed frame box. `web/src/ui/GhostPreview.tsx` renders the translucent preview and rationale affordances.

The final task hardened the proof around the shipped runtime rather than transient UI behavior. `tests/utils/bridge-browser.ts` now provides deterministic consultant fixtures, browser diagnostic readers, and canonical-file assertions for temp workspaces opened through the built CLI. `tests/web/editor-layout-consultant.test.ts` proves the happy path, missing-secret failure path, and stale-preview invalidation path in the real browser runtime. `scripts/verify-s05-layout-consultant.mjs` repeats the same authoring loop against `node dist/cli.js open`, proving reject/no-write, accept/persist/overflow-clear, and missing-secret observability outside the test runner.

With that proof in place, S05 validates both remaining active requirements: the canonical local authoring loop now includes consultant-driven geometry changes without state drift, and the differentiating AI layout consultant behavior is visibly real in design mode.

## Verification

Passed:
- `npm test -- --run tests/bridge/bridge-layout-consultant-contract.test.ts`
- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- `node scripts/verify-s05-layout-consultant.mjs`
- Built-path failure coverage was exercised through the real `dist/cli.js open` runtime inside the browser test and smoke script:
  - missing `OPENAI_API_KEY` surfaces an inspectable consultant error in the browser
  - `/__sfrb/bootstrap` remains canonical and unchanged on failure
  - `resume.sfrb.json` stays byte-identical when rejecting a preview or when consultant configuration is invalid
  - accepting a valid proposal persists the resized frame and clears overflow afterward

Observability confirmed working through runtime assertions against:
- `#consultant-panel[data-consultant-state][data-consultant-code]`
- `#consultant-overflow-status[data-overflow-status]`
- `#consultant-preview-state[data-preview-visible]`
- `#consultant-measurements[data-overflow-px]`
- `#consultant-error`
- `#bridge-payload-preview`
- `/__sfrb/consultant` response codes and payload shape

## Requirements Advanced

- None.

## Requirements Validated

- R001 — The shipped CLI/browser loop now proves consultant-driven layout edits through the same canonical `resume.sfrb.json` boundary, including reject/no-write, accept/persist, bootstrap reconciliation, and failure-path no-drift behavior.
- R006 — Design-mode overflow is detected from rendered content and surfaced as a visible ghost proposal that the user can accept or reject, with overflow clearing after acceptance.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

None.

## Known Limitations

- None within M001 scope.

## Follow-ups

- M002 planning should decide whether consultant support stays limited to frame resizing or expands to multi-frame/layout-content edits.
- If more providers or richer proposals are added later, preserve the current bridge-owned validation boundary and sanitized error taxonomy.

## Files Created/Modified

- `src/agent/LayoutConsultant.ts` — added the provider-backed consultant service, provider adapters, proposal parsing, and proposal safety validation.
- `src/bridge/server.mjs` — added the `/__sfrb/consultant` route, workspace config/env resolution, and sanitized consultant failure mapping.
- `web/src/bridge-client.ts` — added typed consultant request/result helpers for browser consumers.
- `web/src/App.tsx` — added consultant request/apply state, diagnostics, stale-preview invalidation, and accept/reject wiring.
- `web/src/editor/Canvas.tsx` — added design-mode overflow measurement and ghost overlay mounting.
- `web/src/editor/engine.ts` — exported frame-box composition helpers so accept can build a canonical candidate document without preview-state leakage.
- `web/src/ui/GhostPreview.tsx` — added the translucent preview overlay renderer.
- `tests/bridge/bridge-layout-consultant-contract.test.ts` — proved success and sanitized failure paths for `/__sfrb/consultant` without canonical writes.
- `tests/web/editor-layout-consultant.test.ts` — proved the happy path, missing-secret failure path, and stale-preview invalidation path in the real browser runtime.
- `tests/utils/bridge-browser.ts` — added consultant-aware temp-workspace, fixture-server, diagnostics, and canonical-file helpers.
- `scripts/verify-s05-layout-consultant.mjs` — added standalone built-runtime smoke verification for consultant happy/failure flows.
- `.gsd/REQUIREMENTS.md` — moved R001 and R006 to validated based on executed S05 proof.
- `.gsd/milestones/M001/M001-ROADMAP.md` — marked S05 complete and updated milestone proof/success status.
- `.gsd/PROJECT.md` — refreshed project state to reflect a completed M001 editor + consultant loop.
- `.gsd/STATE.md` — advanced state from active-slice execution to post-M001 completion.

## Forward Intelligence

### What the next slice should know
- The most trustworthy consultant signals are not transient button states; they are canonical file bytes, bootstrap payload changes, preview visibility, and overflow-clear diagnostics.
- The browser-side consultant flow is intentionally split: Canvas measures rendered overflow truth, App owns proposal lifecycle, and `/__sfrb/editor` remains the only write path.
- The current provider boundary is ready for reuse. Future AI features should keep all secret access, raw provider responses, and malformed-output handling inside the bridge.

### What's fragile
- `web/src/editor/Canvas.tsx` overflow measurement depends on rendered DOM settle timing — changes to editing, dragging, or typography behavior can reintroduce noisy false positives if debounce/settle logic is bypassed.
- `src/agent/LayoutConsultant.ts` provider parsing is intentionally narrow — future provider/model changes may require updates to keep structured-output assumptions stable.

### Authoritative diagnostics
- `tests/web/editor-layout-consultant.test.ts` — strongest browser-level proof of reject/no-write, accept/persist, missing-secret failure visibility, and stale-preview invalidation.
- `tests/bridge/bridge-layout-consultant-contract.test.ts` — strongest proof that the consultant bridge route is safe, sanitized, and non-mutating.
- `node scripts/verify-s05-layout-consultant.mjs` — fastest end-to-end confirmation that the shipped CLI-opened runtime still satisfies the milestone consultant loop.

### What assumptions changed
- “A transient post-accept UI state is the right success signal” — in practice, durable signals like preview cleared, canonical payload updated, on-disk file changed only after accept, and overflow cleared are more reliable.
- “Consultant UX needs its own mutation route” — in practice, S05 worked cleanly by keeping `/__sfrb/editor` as the single canonical write boundary and treating consultant output as just another candidate document change.
