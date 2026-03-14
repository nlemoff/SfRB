# S05: AI Layout Consultant — UAT

**Milestone:** M001
**Written:** 2026-03-14

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: S05 is an integration-heavy slice whose real value is visible behavior on top of the shipped local runtime. The most important proof is the actual `dist/cli.js open` loop plus targeted browser checks that confirm overflow detection, ghost preview separation, reject/no-write behavior, accept/persist behavior, and provider-failure observability.

## Preconditions

- Node 20+ is installed.
- Project dependencies are installed.
- `npm run build` has completed successfully.
- A design-mode workspace exists with both:
  - `sfrb.config.json`
  - `resume.sfrb.json`
- The design workspace contains at least one page and one linked frame whose text visibly overflows its fixed-height body.
- For happy-path testing, the workspace config points at a supported provider and the configured API key env var is present.
- For failure-path testing, a second workspace (or a second run) is available with the same provider config but the required API key env var intentionally unset.
- A local browser is available if running the checks manually.

## Smoke Test

1. Run `node dist/cli.js open --cwd <design-workspace> --port 4312 --no-open`.
2. Open `http://127.0.0.1:4312/`.
3. Select the overflowing frame.
4. Click the consultant request control.
5. **Expected:**
   - `#editor-canvas[data-physics-mode="design"]` is visible
   - `#consultant-overflow-status[data-overflow-status="overflow"]`
   - the consultant produces a visible ghost preview with accept/reject controls
   - `#consultant-preview-state[data-preview-visible="true"]`

## Test Cases

### 1. Overflow is detected only from the rendered design frame and surfaced with diagnostics

1. Seed a design workspace with one paragraph block linked to a frame that is too short for its text.
2. Run `node dist/cli.js open --cwd <overflow-workspace> --port 0 --no-open` and open the reported URL.
3. Click the overflowing frame once to select it.
4. Wait for the editor to settle.
5. **Expected:**
   - `#editor-canvas[data-physics-mode="design"]` is visible
   - `#consultant-frame-id[data-frame-id="summaryFrame"]` (or the seeded frame id) matches the selected frame
   - `#consultant-overflow-status[data-overflow-status="overflow"]`
   - `#consultant-measurements[data-overflow-px]` reports a positive overflow amount
   - no canonical file write happens just from measuring overflow

### 2. Requesting a consultant proposal renders a distinct ghost preview without mutating the canonical document

1. Use the overflowing design workspace from test case 1 with a valid provider fixture or configured key.
2. Record the raw bytes of `resume.sfrb.json` before requesting a proposal.
3. Click the consultant request control.
4. Wait for the consultant state to move through `requesting` into preview.
5. **Expected:**
   - `#consultant-panel[data-consultant-state="preview"]`
   - `#consultant-preview-state[data-preview-visible="true"]`
   - a ghost preview element like `[data-testid="consultant-ghost-preview-summaryFrame"]` is visible
   - `#consultant-rationale` contains the consultant rationale text
   - `#bridge-payload-preview` still reflects the unchanged canonical payload
   - `resume.sfrb.json` remains byte-identical while the preview is only being shown

### 3. Rejecting a proposal clears the preview and performs no canonical write

1. Start from a visible consultant preview in the overflowing design workspace.
2. Record the current `resume.sfrb.json` bytes.
3. Click the reject control.
4. Wait for the consultant state to settle.
5. **Expected:**
   - `#consultant-preview-state[data-preview-visible="false"]`
   - the ghost preview element disappears
   - `#consultant-panel` returns to an idle or detectable non-preview state
   - `resume.sfrb.json` is byte-identical to the pre-reject snapshot
   - the canonical frame box in `/__sfrb/bootstrap` is unchanged

### 4. Accepting a proposal persists the resized frame through `/__sfrb/editor` and clears overflow

1. Request a fresh consultant proposal so the ghost preview is visible again.
2. Record the canonical frame box from `/__sfrb/bootstrap`.
3. Click the accept control.
4. Wait for the save/apply cycle and bootstrap refetch to settle.
5. **Expected:**
   - `#consultant-preview-state[data-preview-visible="false"]`
   - `#editor-save-status[data-save-state="idle"]` after the write completes
   - `resume.sfrb.json` now contains the resized frame geometry proposed by the consultant
   - `/__sfrb/bootstrap` reflects the same resized canonical frame box
   - `#consultant-overflow-status` no longer reports overflow for that frame
   - the persisted geometry matches the canonical document rather than a browser-only override

### 5. Provider misconfiguration or missing secret is inspectable and non-mutating

1. Start `node dist/cli.js open --cwd <design-workspace-with-missing-secret> --port 0 --no-open` where `sfrb.config.json` references a provider/env var but the env var is unset.
2. Open the reported URL and select the overflowing frame.
3. Click the consultant request control.
4. Wait for the consultant request to fail.
5. **Expected:**
   - `#consultant-panel[data-consultant-state="error"]` or another explicit failure state
   - `#consultant-panel[data-consultant-code="configuration_missing"]` (or the expected categorized failure code)
   - `#consultant-error` contains an actionable but sanitized error message
   - `/__sfrb/bootstrap` remains unchanged
   - `resume.sfrb.json` is unchanged on disk
   - no API secret value appears anywhere in the UI or error payload

### 6. A stale preview is invalidated when canonical data changes underneath it

1. Start from a visible consultant preview in a design workspace.
2. Change the canonical frame geometry underneath the browser session through the normal local document path (for example by editing `resume.sfrb.json` externally or using the existing editor route in a controlled test).
3. Wait for the bridge update/bootstrap refetch to reach the browser.
4. **Expected:**
   - the previous preview disappears automatically
   - `#consultant-preview-state[data-preview-visible="false"]`
   - the consultant state/diagnostics indicate the preview is no longer current
   - the browser does not let the stale preview be accepted against the changed canonical payload

## Edge Cases

### Missing or malformed provider output

1. Point the workspace at a deterministic provider fixture that returns malformed resize output.
2. Request a proposal.
3. **Expected:** The bridge returns a categorized consultant failure such as `malformed_provider_output` or `proposal_rejected`, the UI surfaces the failure via consultant diagnostics, and `resume.sfrb.json` stays unchanged.

### Reject path after repeated requests

1. Request a proposal, reject it, then request again.
2. **Expected:** Each preview is derived from the current canonical payload, not from the previously rejected ghost state.

### Accept path should clear the original overflow signal

1. Accept a proposal that increases the selected frame height.
2. **Expected:** After the canonical write/refetch completes, overflow diagnostics show the issue cleared for the selected frame rather than lingering from stale measurement state.

## Failure Signals

- `#consultant-overflow-status` never reports overflow for an obviously overflowing design frame.
- The consultant request exposes raw provider errors, auth headers, or secret values.
- A visible ghost preview changes `resume.sfrb.json` before accept.
- Reject changes the canonical frame box or writes to disk.
- Accept leaves the preview visible but fails to update `/__sfrb/bootstrap` and `resume.sfrb.json`.
- Overflow remains flagged after a successful accepted resize that should have cleared it.
- A missing-secret/provider failure mutates the canonical document or leaves no inspectable consultant error.
- A preview remains actionable after canonical payload drift underneath it.

## Requirements Proved By This UAT

- R001 — The shipped CLI/browser loop stays canonical and drift-free even when AI consultant proposals are requested, rejected, accepted, or fail.
- R006 — The system detects overflow in fixed-layout workspaces and presents a visible suggested fix that the user can accept or reject.

## Not Proven By This UAT

- Quality of consultant suggestions beyond the slice’s current resize-focused contract.
- Non-resize layout mutations such as reordering blocks, moving multiple frames, or rewriting content.
- Performance characterization for large resumes or repeated consultant requests across many frames.

## Notes for Tester

- For the fastest executable proof, run:
  - `npm test -- --run tests/bridge/bridge-layout-consultant-contract.test.ts`
  - `npm test -- --run tests/web/editor-layout-consultant.test.ts`
  - `node scripts/verify-s05-layout-consultant.mjs`
- The most trustworthy signals are canonical file contents, `/__sfrb/bootstrap`, and the stable consultant diagnostics (`#consultant-panel`, `#consultant-overflow-status`, `#consultant-preview-state`, `#consultant-error`), not just the appearance of the overlay.
- A categorized consultant error on a missing-secret or malformed-provider path is expected behavior, not a test failure, as long as the canonical document stays unchanged.
