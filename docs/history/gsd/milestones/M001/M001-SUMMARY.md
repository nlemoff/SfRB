---
id: M001
provides:
  - A verified local-first resume authoring foundation with workspace init, canonical document validation, live CLI-to-browser sync, mode-aware browser editing, and a bridge-backed AI layout consultant.
key_decisions:
  - D007 kept `sfrb.config.json` limited to provider metadata, provider env-var naming, and workspace physics so secrets stay out of local config.
  - D009 defined the canonical SfRB document contract as strict Zod schemas and emitted `schema.json` from that same source of truth.
  - D012 kept the shipped CLI in its current CommonJS build while launching a separate ESM Vite bridge runtime over an explicit process boundary.
  - D016 built the editor as a DOM-first surface over the canonical bridge with validated browser writes instead of a separate client-side document store.
  - D020 split S05 so overflow is measured in the browser while structured consultant proposals are requested only through the bridge-backed consultant route.
patterns_established:
  - One canonical workspace boundary: `sfrb.config.json` + `resume.sfrb.json`, with browser state always reconciled from `/__sfrb/bootstrap`.
  - Browser mutations persist only through validated bridge routes (`/__sfrb/editor` for writes, `/__sfrb/consultant` for non-mutating AI proposals).
  - Workspace physics live in config, not the document, and are enforced both at document load time and at browser write time.
  - Bridge events remain invalidation signals; canonical state is always re-read rather than mirrored from transport payloads.
observability_surfaces:
  - `npm run build`
  - `node scripts/verify-s01-init-smoke.mjs`
  - `node scripts/verify-s02-document-smoke.mjs`
  - `node scripts/verify-s03-open-smoke.mjs`
  - `node scripts/verify-s04-editor-smoke.mjs`
  - `node scripts/verify-s05-layout-consultant.mjs`
  - `/__sfrb/bootstrap`
  - `/__sfrb/editor`
  - `/__sfrb/consultant`
  - `tests/cli/open-command.test.ts`
  - `tests/bridge/bridge-live-sync.test.ts`
  - `tests/bridge/bridge-editor-contract.test.ts`
  - `tests/bridge/bridge-layout-consultant-contract.test.ts`
  - `tests/web/editor-document-mode.test.ts`
  - `tests/web/editor-design-mode.test.ts`
  - `tests/web/editor-layout-consultant.test.ts`
requirement_outcomes:
  - id: R002
    from_status: active
    to_status: validated
    proof: S01 shipped `sfrb init`, config-store validation, `.gitignore` protection, CLI tests, and the fresh `node scripts/verify-s01-init-smoke.mjs` run passed during milestone completion.
  - id: R005
    from_status: active
    to_status: validated
    proof: S02 established the strict document schema, workspace-physics-aware validation, `schema.json` parity checks, and the fresh `node scripts/verify-s02-document-smoke.mjs` run passed during milestone completion.
  - id: R003
    from_status: active
    to_status: validated
    proof: S03 shipped `sfrb open`, canonical `/__sfrb/bootstrap` serving, live invalidation events, bridge tests, and the fresh `node scripts/verify-s03-open-smoke.mjs` run passed during milestone completion.
  - id: R004
    from_status: active
    to_status: validated
    proof: S04 shipped document-mode inline editing, design-mode drag + linked text editing, validated `/__sfrb/editor` writes, browser tests, and the fresh `node scripts/verify-s04-editor-smoke.mjs` run passed during milestone completion.
  - id: R001
    from_status: active
    to_status: validated
    proof: Across S02-S05 the shipped runtime now preserves one canonical local document loop; S05 browser/bridge proof plus the fresh `node scripts/verify-s05-layout-consultant.mjs` run confirmed reject/no-write, accept/persist, and no-drift behavior.
  - id: R006
    from_status: active
    to_status: validated
    proof: S05 shipped overflow detection, visible ghost preview, accept/reject handling, sanitized consultant failures, browser/bridge tests, and the fresh `node scripts/verify-s05-layout-consultant.mjs` run confirmed overflow-clear after accept.
duration: ~17h 29m+
verification_result: passed
completed_at: 2026-03-15T02:25:43-07:00
---

# M001: Foundation & Physics

**Verified the full local authoring foundation: CLI init, canonical schema + physics validation, live bridge sync, mode-aware browser editing, and a safe AI layout consultant all work together through the shipped runtime.**

## What Happened

M001 turned the project from an idea about a hybrid resume editor into a working local product loop.

S01 established the workspace boundary: `sfrb init` now captures provider metadata, env-var naming, and workspace physics into a validated local config without storing secrets. S02 then created the canonical document contract around `resume.sfrb.json`, separating semantic content from spatial layout while enforcing cross-links and workspace-specific physics rules through one strict validation boundary.

S03 connected that document boundary to the browser through the real shipped CLI path. `sfrb open` launches a separate ESM bridge runtime, serves canonical workspace state through `/__sfrb/bootstrap`, watches both config and document files, and keeps the browser reconciled by refetching canonical state after bridge invalidation events. That gave the project a real CLI-to-browser path instead of parallel mock flows.

S04 closed the editing loop. The browser is no longer read-only: document physics supports inline text editing without drag affordances, design physics supports canonical frame rendering, frame dragging, and linked text editing, and every browser mutation persists only through `/__sfrb/editor`, where schema and physics validation still protect the canonical file boundary.

S05 retired the remaining milestone risk by adding a bridge-backed AI layout consultant. Overflow is measured from rendered design-mode content in the browser, structured resize proposals are requested through `/__sfrb/consultant`, ghost previews stay non-canonical until explicit accept, and accepted proposals persist through the same validated editor write path. The result is a complete local-first loop where the browser, bridge, and on-disk JSON remain in sync even when AI is involved.

## Cross-Slice Verification

All milestone success criteria were checked against slice proof and fresh completion-time verification. No success criterion failed.

- **`sfrb init` successfully captures AI keys and workspace physics preference.**
  - Proven in S01 by `tests/cli/init-command.test.ts`, `tests/config/sfrb-config.test.ts`, and the slice smoke workflow.
  - Re-verified at milestone completion by a fresh `node scripts/verify-s01-init-smoke.mjs` run, which passed and created a real temp-workspace `sfrb.config.json`.

- **`sfrb open` launches a local server and opens a browser showing the current document.**
  - Proven in S03 by `tests/cli/open-command.test.ts`, `tests/bridge/bridge-live-sync.test.ts`, and browser spot-checks against the live bridge.
  - Re-verified at milestone completion by a fresh `node scripts/verify-s03-open-smoke.mjs` run, which passed and confirmed ready payload, update propagation, and invalid-state handling through the shipped runtime.

- **Direct text editing on the canvas updates the underlying local JSON model.**
  - Proven in S04 by `tests/web/editor-document-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, `tests/bridge/bridge-editor-contract.test.ts`, and `scripts/verify-s04-editor-smoke.mjs`.
  - Re-verified at milestone completion by a fresh `node scripts/verify-s04-editor-smoke.mjs` run, which passed and confirmed document-mode persistence plus linked text editing in design mode.

- **The editor respects "Design Mode" (fixed boxes) and "Doc Mode" (reflow) constraints.**
  - Proven across S02 and S04: S02 established config-owned physics validation; S04 proved mode-specific browser behavior and invalid-mutation rejection through `/__sfrb/editor`.
  - Re-verified at milestone completion by fresh `node scripts/verify-s02-document-smoke.mjs` and `node scripts/verify-s04-editor-smoke.mjs` runs, which passed and confirmed both the validation boundary and the browser affordance split.

- **AI correctly detects a layout overflow and displays a suggested resolution as a visual overlay.**
  - Proven in S05 by `tests/bridge/bridge-layout-consultant-contract.test.ts`, `tests/web/editor-layout-consultant.test.ts`, and `scripts/verify-s05-layout-consultant.mjs`.
  - Re-verified at milestone completion by a fresh `node scripts/verify-s05-layout-consultant.mjs` run, which passed and confirmed reject/no-write, accept/persist, visible preview flow, overflow clearing after accept, and missing-secret failure diagnostics.

Milestone definition of done also passed:
- All slices in `.gsd/milestones/M001/M001-ROADMAP.md` are `[x]`.
- All slice summaries exist for S01-S05.
- Cross-slice integration points work through the shipped runtime, confirmed by a fresh `npm run build` plus S01-S05 smoke-script pass during milestone completion.
- CLI and Web UI synchronization remained intact through edit, drag, consultant reject, consultant accept, and invalid-state flows.
- The Layout Consultant successfully resolved overflow in the fixed-layout path, with persisted frame resize and overflow-clear proof from the S05 smoke run.

## Requirement Changes

- R002: active → validated — S01 delivered the init/config boundary and the fresh S01 smoke run passed.
- R005: active → validated — S02 delivered the canonical schema + physics validation boundary and the fresh S02 smoke run passed.
- R003: active → validated — S03 delivered the real CLI-opened bridge and the fresh S03 smoke run passed.
- R004: active → validated — S04 delivered mode-aware editing with validated writes and the fresh S04 smoke run passed.
- R001: active → validated — the full S02-S05 authoring loop now holds one canonical document without drift, confirmed by S05 proof and the fresh S05 smoke run.
- R006: active → validated — S05 delivered overflow detection, ghost preview, and accept/reject consultant flow, confirmed by the fresh S05 smoke run.

## Forward Intelligence

### What the next milestone should know
- The strongest contract in the system is still the canonical workspace boundary: `sfrb.config.json`, `resume.sfrb.json`, `/__sfrb/bootstrap`, and validated bridge mutation routes. Extending the product is safer when new behavior composes with those boundaries rather than bypassing them.
- The shipped runtime has already proven that browser invalidation events should stay lightweight and canonical state should keep coming from refetches. That pattern is worth preserving unless a future milestone can prove a better reconciliation model without introducing drift.
- The AI boundary is now in the right place: secrets, provider calls, and malformed-output handling live inside the bridge. Future AI features should reuse that boundary instead of exposing provider behavior to the browser.

### What's fragile
- `web/src/editor/engine.ts` reconciliation still assumes semantic structure stays stable during active editing; richer structure-changing edits will need careful merge behavior.
- `web/src/editor/Canvas.tsx` overflow measurement depends on rendered DOM settle timing; typography or interaction changes can make the consultant path noisy if that timing is disturbed.
- `src/bridge/server.mjs` route ordering matters; `/__sfrb/bootstrap`, `/__sfrb/editor`, and `/__sfrb/consultant` must stay ahead of any HTML fallback behavior.

### Authoritative diagnostics
- `node scripts/verify-s05-layout-consultant.mjs` — best single end-to-end proof that the milestone still works through the real built CLI-opened runtime.
- `node scripts/verify-s04-editor-smoke.mjs` — best direct proof that document/design editing behavior and persistence still match the shipped affordance split.
- `node scripts/verify-s03-open-smoke.mjs` and `/__sfrb/bootstrap` — best signals for bridge readiness, canonical payload integrity, and invalid-state propagation.
- `tests/bridge/bridge-layout-consultant-contract.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` — best focused proof that write/consultant boundaries remain safe and non-drifting.

### What assumptions changed
- "The hard part is just getting a browser shell running." — In practice, the important work was protecting one canonical document boundary and making browser state refetch from it instead of drifting into a second model.
- "AI layout help needs its own mutation path." — In practice, the consultant worked cleanly once proposal generation stayed separate and accepted changes reused the existing validated `/__sfrb/editor` write path.
- "Physics behavior can wait until the editor." — In practice, the physics contract had to exist first at the document/config boundary so later bridge and editor layers could stay consistent.

## Files Created/Modified

- `src/commands/init.ts` — shipped the real workspace-init command boundary.
- `src/config/store.ts` — centralized validated config persistence and `.gitignore` protection.
- `src/document/schema.ts` — defined the canonical strict document contract and schema export source.
- `src/document/validation.ts` — enforced workspace-physics-aware document validation.
- `src/commands/open.ts` — launched the bridge runtime from the shipped CLI.
- `src/bridge/server.mjs` — served canonical bootstrap state, validated write routes, and the consultant route.
- `web/src/App.tsx` — hosted the editor shell plus consultant lifecycle and diagnostics.
- `web/src/editor/Canvas.tsx` — implemented the mode-aware editing surface and overflow measurement.
- `web/src/editor/engine.ts` — handled editor reconciliation, local overrides, and frame-box composition.
- `src/agent/LayoutConsultant.ts` — implemented provider-backed structured consultant proposal handling.
- `scripts/verify-s05-layout-consultant.mjs` — remains the strongest full-runtime milestone proof surface.
- `.gsd/milestones/M001/M001-SUMMARY.md` — recorded milestone-level completion, verification, and handoff context.
- `.gsd/PROJECT.md` — refreshed current project state after verified M001 completion.
- `.gsd/STATE.md` — advanced the project handoff to post-M001 / M002 planning.
