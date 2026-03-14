# S05: AI Layout Consultant

**Goal:** Detect overflow in design-mode workspaces, request a structured layout fix through the bridge using the workspace’s BYOK provider config, render that fix as a rejectable ghost preview, and accept it through the existing canonical editor write path without introducing state drift.
**Demo:** In a design workspace opened through `sfrb open`, an overflowing fixed frame becomes inspectably flagged, the user requests an AI proposal, the browser shows a translucent resized-frame preview with rationale plus accept/reject controls, reject leaves `resume.sfrb.json` untouched, and accept persists the resized frame through `/__sfrb/editor` so the overflow clears in the canonical document.

This slice groups into three tasks because there are three distinct risks that have to retire in order. First is the secret/runtime boundary: the browser cannot safely call providers, so task 1 establishes a bridge-owned consultant contract with structured, validated proposals and testable failure states before any UI depends on it. Second is the product-specific UX risk: task 2 keeps overflow detection and ghost preview state local to the DOM-first editor so preview never gets confused with canonical frame overrides, while accept/reject still close through the existing editor mutation route. Third is milestone proof: task 3 exercises the real `dist/cli.js open` runtime with a temp design workspace and consultant diagnostics so R001 and R006 are proven on the shipped loop, not just on isolated helpers. This slice directly owns the remaining active requirements **R001** and **R006**.

## Must-Haves

- Overflow is detected in design physics from the rendered frame text region and surfaced through stable browser diagnostics.
- The bridge exposes a consultant request path that resolves provider config from `sfrb.config.json`, reads the real API key from `process.env`, and returns only schema-checked frame-resize proposals or actionable failure states.
- Consultant preview state is visually distinct from canonical frame geometry, survives only as long as it matches the current canonical payload, and can be accepted or rejected explicitly.
- Accepting a proposal persists through the existing `/__sfrb/editor` validated write path; rejecting a proposal performs no canonical write.
- Slice verification proves the full local authoring loop: overflow → proposal → ghost preview → reject/no-write and accept/persist/overflow-cleared through the real CLI-opened runtime.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `npm test -- --run tests/bridge/bridge-layout-consultant-contract.test.ts`
- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- `node scripts/verify-s05-layout-consultant.mjs`
- Built-path failure check: run `node dist/cli.js open --cwd <temp-workspace> --port 0 --no-open` against a design workspace with a missing/invalid consultant provider secret, request a proposal, and verify the browser exposes an inspectable consultant error while `/__sfrb/bootstrap` and `resume.sfrb.json` remain unchanged.

## Observability / Diagnostics

- Runtime signals: consultant request state (`idle` / `detecting` / `requesting` / `preview` / `applying` / `error`), overflow status per selected frame, proposal source-frame identity, bridge consultant error codes, and the existing editor save lifecycle.
- Inspection surfaces: `/__sfrb/bootstrap`, the new consultant bridge response, stable browser ids/testids for overflow and proposal state, `tests/bridge/bridge-layout-consultant-contract.test.ts`, `tests/web/editor-layout-consultant.test.ts`, and `scripts/verify-s05-layout-consultant.mjs`.
- Failure visibility: a future agent can see whether overflow was detected, whether the provider call failed vs returned no proposal, whether a preview is stale/cleared, and whether accept reached canonical persistence.
- Redaction constraints: diagnostics may expose provider name, env-var key name, workspace paths, and error category, but must never print API secret values or raw provider auth headers.

## Integration Closure

- Upstream surfaces consumed: `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, the S04 `/__sfrb/bootstrap` + `/__sfrb/editor` reconciliation contract, and workspace `sfrb.config.json` / `resume.sfrb.json`.
- New wiring introduced in this slice: rendered overflow measurement → bridge consultant request → structured proposal validation → browser ghost preview state → `/__sfrb/editor` accept path → watcher/bootstrap reconciliation.
- What remains before the milestone is truly usable end-to-end: nothing for M001 if this slice lands with the stated proof.

## Tasks

- [ ] **T01: Add the bridge-backed consultant contract and provider safety boundary** `est:2h`
  - Why: The milestone risk cannot retire until the bridge can securely turn workspace AI config into a structured, validated frame-resize proposal without leaking secrets into the browser.
  - Files: `src/bridge/server.mjs`, `src/agent/LayoutConsultant.ts`, `web/src/bridge-client.ts`, `package.json`, `tests/bridge/bridge-layout-consultant-contract.test.ts`, `tests/utils/bridge-browser.ts`
  - Do: Add a dedicated consultant route on the bridge; resolve `config.ai.provider` and `config.ai.apiKeyEnvVar` from the workspace config; read the secret only in the bridge process; implement a provider abstraction that returns a tightly-scoped frame resize proposal with rationale/confidence or an actionable unavailable/error result; validate that the target frame exists and proposed box numbers are finite/positive before returning them; and add a bridge contract test that covers success, missing-secret/provider-unavailable, and rejected malformed proposals without mutating the canonical document.
  - Verify: `npm test -- --run tests/bridge/bridge-layout-consultant-contract.test.ts`
  - Done when: the browser has a typed consultant request helper, the bridge can return only safe structured resize proposals, and consultant failures remain inspectable without touching `resume.sfrb.json`.
- [ ] **T02: Detect overflow locally and render a rejectable ghost preview in design mode** `est:3h`
  - Why: R006 is only user-real once the design canvas can observe overflow, ask for a proposal at the right time, and show a preview that is clearly separate from canonical edits.
  - Files: `web/src/App.tsx`, `web/src/bridge-client.ts`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, `web/src/ui/GhostPreview.tsx`, `tests/web/editor-layout-consultant.test.ts`
  - Do: Measure overflow from the frame’s text body after render/settle in design mode only; add consultant state and diagnostics to the app/editor shell; keep preview box state separate from engine `frameBoxOverrides`; render a translucent overlay plus rationale and accept/reject controls; invalidate stale preview when the canonical payload changes under it; and on accept compose a candidate document and persist it through the existing `/__sfrb/editor` route while reject just clears preview.
  - Verify: `npm test -- --run tests/web/editor-layout-consultant.test.ts`
  - Done when: a design frame with overflow can surface a ghost resize preview with stable diagnostics, reject leaves the document untouched, and accept persists the resized frame through the canonical editor path.
- [ ] **T03: Prove the consultant loop through the real CLI-opened runtime** `est:2h`
  - Why: The slice is not complete until the shipped `sfrb open` path proves the whole authoring loop, including failure observability and canonical persistence, in a temp workspace.
  - Files: `tests/utils/bridge-browser.ts`, `tests/web/editor-layout-consultant.test.ts`, `scripts/verify-s05-layout-consultant.mjs`, `web/src/App.tsx`, `.gsd/STATE.md`
  - Do: Extend the built-runtime browser helpers for consultant fixtures and observability reads; add end-to-end proof that creates a visible overflow in a temp design workspace, requests a proposal, verifies ghost preview diagnostics, exercises reject/no-write and accept/persist/overflow-cleared behavior, and verifies provider-error visibility; then encode the same path in a standalone smoke script against `dist/cli.js open` so milestone proof survives outside the test runner.
  - Verify: `npm test -- --run tests/web/editor-layout-consultant.test.ts && node scripts/verify-s05-layout-consultant.mjs`
  - Done when: the real CLI-opened runtime proves both the happy path and the provider-failure path with canonical file assertions and stable UI diagnostics.

## Files Likely Touched

- `src/bridge/server.mjs`
- `src/agent/LayoutConsultant.ts`
- `web/src/App.tsx`
- `web/src/bridge-client.ts`
- `web/src/editor/Canvas.tsx`
- `web/src/editor/engine.ts`
- `web/src/ui/GhostPreview.tsx`
- `tests/bridge/bridge-layout-consultant-contract.test.ts`
- `tests/web/editor-layout-consultant.test.ts`
- `tests/utils/bridge-browser.ts`
- `scripts/verify-s05-layout-consultant.mjs`
- `package.json`
