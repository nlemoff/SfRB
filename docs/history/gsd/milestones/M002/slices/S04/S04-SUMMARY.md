---
id: S04
parent: M002
milestone: M002
provides:
  - A real Text lens that works in document and design workspaces as a calm writing surface over the canonical resume model, with built-runtime proof that text edits and basic structure edits persist through the shipped CLI/browser loop and that invalid text actions fail without writing.
requires:
  - S01
  - S02
affects:
  - S06
  - S07
key_files:
  - src/editor/actions.ts
  - web/src/bridge-client.ts
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - tests/document/editor-actions.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
  - tests/web/editor-first-run-guidance.test.ts
  - tests/web/editor-text-mode.test.ts
  - tests/web/editor-design-mode.test.ts
  - scripts/verify-s04-editor-smoke.mjs
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
key_decisions:
  - Keep Text mode as a browser-local lens distinct from canonical workspace physics so document and design workspaces can share one writing-first surface without mutating persisted workspace mode.
  - Keep text edits and text-structure operations canonical at the shared editor action boundary so browser text mode, bridge persistence, and later CLI parity all point at the same mutation contract.
  - Prove the slice at the shipped runtime boundary by asserting `Last action`, `/__sfrb/bootstrap`, and on-disk `resume.sfrb.json` after success and invalid-action flows rather than trusting only in-process browser tests.
patterns_established:
  - Text-mode proof is only complete when a real `dist/cli.js open` workspace can switch into the Text lens, perform a content edit plus a structure edit, and then re-read bridge bootstrap and disk state to confirm the canonical document changed.
  - Invalid text actions should be tested against the same shipped bridge path and must show actionable `action_invalid` diagnostics while bootstrap payloads and on-disk JSON stay byte-stable.
observability_surfaces:
  - `#editing-lenses[data-active-lens]`
  - `#shell-active-lens`
  - `#editor-canvas[data-active-lens][data-physics-mode]`
  - `[data-testid="editor-text-surface"]`
  - `#editor-active-text-target[data-target-id][data-target-kind]`
  - `#editor-active-text-section[data-section-id]`
  - `#editor-save-status[data-save-state]`
  - `#editor-last-action-kind[data-action-kind]`
  - `/__sfrb/editor`
  - `/__sfrb/bootstrap`
  - `resume.sfrb.json`
  - `tests/web/editor-text-mode.test.ts`
  - `tests/web/editor-design-mode.test.ts`
  - `scripts/verify-s04-editor-smoke.mjs`
  - `.gsd/milestones/M002/slices/S04/tasks/T01-SUMMARY.md`
  - `.gsd/milestones/M002/slices/S04/tasks/T02-SUMMARY.md`
  - `.gsd/milestones/M002/slices/S04/tasks/T03-SUMMARY.md`
duration: ~1d
verification_result: passed
completed_at: Monday, March 16, 2026 at 08:18:06 PM PDT
blocker_discovered: false
---

# S04: Text Mode as Real Writing Surface

**Shipped Text mode as a real writing surface: users can enter an explicit Text lens in document and design workspaces, edit and restructure content through canonical actions, and trust the shipped runtime because the built smoke flow now re-proves success and no-write failure behavior through `Last action`, `/__sfrb/bootstrap`, and `resume.sfrb.json`.**

## What Happened

S04 completed the text-side product loop in four steps and then retired it at the shipped runtime boundary.

T01 established the canonical writing-first mutation set in `src/editor/actions.ts` and `web/src/bridge-client.ts`. Text mode no longer depended on whole-document rewrites to feel useful: insert/remove/reorder behavior now exists as explicit shared actions, and the bridge contract already knew how to reject malformed or unsupported structure mutations with actionable diagnostics and no-write guarantees.

T02 separated the product shell’s active lens from canonical workspace physics. `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, and `web/src/editor/engine.ts` now let both document and design workspaces enter a calm Text lens without pretending the workspace physics changed. The product shell hides drag/tile/diagnostic noise while preserving stable agent-visible selectors so future slices can still inspect what the writing surface is doing.

T03 turned that lens into a real editor rather than a view mode. The browser engine now keeps text drafts, active target identity, and focus continuity session-local while still committing actual content edits and structure actions through canonical bridge mutations. The browser proofs in `tests/web/editor-text-mode.test.ts` and `tests/web/editor-design-mode.test.ts` confirmed that text mode can rewrite content, insert follow-up blocks, and reorder supported structures without dropping focus or falling back to browser-only state.

T04 closed the slice with shipped-runtime evidence. `scripts/verify-s04-editor-smoke.mjs` now builds the app, opens real document and design template workspaces through `dist/cli.js open`, explicitly enters the Text lens, performs a real `replace_block_text` edit and canonical `insert_block` structure edit, then re-reads `/__sfrb/bootstrap` and `resume.sfrb.json` to prove the saved resume changed canonically. It also submits an invalid text action (`remove_block` against single-block `skillsSection`) and verifies the bridge returns `action_invalid` issues while both bootstrap and disk state remain unchanged. This is the proof later slices can trust when they build mode reconciliation or CLI parity on top of S04.

## Verification

Passed:
- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-text-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs`

Built-runtime proof confirmed all slice must-haves:
- Text mode is available and functional in both document and design workspaces.
- A canonical structure action persists through `Last action`, `/__sfrb/bootstrap`, and `resume.sfrb.json`.
- Invalid text actions expose actionable diagnostics and do not mutate bootstrap or disk state.

Note on command form: the slice plan listed absolute worktree test paths, but Vitest excludes `.gsd/**`; the equivalent repo-relative test paths above are the working commands from this worktree shell.

## Requirements Advanced

- R008 — materially advanced and now has explicit built-runtime proof for the Text lens portion of the three-lens promise.
- R011 — materially advanced by replacing drag- and diagnostics-heavy chrome with a calmer writing surface while Text mode is active.
- R012 — materially advanced by establishing inspectable text-side state, structure-action semantics, and failure surfaces that S06 can use when finalizing reconciliation policy.

## Requirements Validated

- None. S04 retires the text-mode portion of R008, but full requirement validation still depends on S05/S06 and direct CLI parity remains in S07.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

- `scripts/verify-s04-editor-smoke.mjs` now imports the built `dist/document/starters.js` starter factory after build so the shipped smoke path exercises the same production template generator used elsewhere, rather than maintaining a hand-authored smoke-only template document.
- The final verification record uses repo-relative Vitest paths because the package runner excludes `.gsd/**`, which makes the literal absolute worktree paths from the slice plan non-executable even though the tests themselves pass from this worktree.

## Known Limitations

- Text mode now has real writing and basic structure-edit behavior, but full cross-lens reconciliation policy is still deferred to S06.
- Freeform remains preview-only at the shell level until S05 ships the element editor.
- Direct CLI invocation of the canonical action surface is still a later proof target for S07.

## Follow-ups

- S05 should preserve S04’s observability discipline so freeform work can be inspected through stable selectors and canonical bridge surfaces instead of browser-local assumptions.
- S06 should use `scripts/verify-s04-editor-smoke.mjs` as the baseline regression guard whenever text/tile/freeform reconciliation logic changes.
- S07 should reuse the same success/no-write proof pattern at the direct CLI action boundary.

## Files Created/Modified

- `src/editor/actions.ts` — defined and applied canonical text-structure mutations with actionable failure diagnostics.
- `web/src/bridge-client.ts` — exposed the shared text-mode action contract to the browser runtime.
- `web/src/App.tsx` — added the shell-level Text lens and calm writing-surface framing.
- `web/src/editor/Canvas.tsx` — rendered the writing-first text surface and text-mode observability signals.
- `web/src/editor/engine.ts` — preserved text focus/draft continuity while committing canonical actions.
- `tests/document/editor-actions.test.ts` — proved canonical text-structure apply paths and failure guards.
- `tests/bridge/bridge-editor-contract.test.ts` — proved bridge persistence plus invalid-action no-write behavior for text actions.
- `tests/web/editor-first-run-guidance.test.ts` — preserved guidance proof alongside the new editing surface.
- `tests/web/editor-text-mode.test.ts` — proved document/design text-lens behavior, structure edits, and focus continuity.
- `tests/web/editor-design-mode.test.ts` — proved design-workspace text-mode insertion and persistence.
- `scripts/verify-s04-editor-smoke.mjs` — added the shipped runtime proof for text edits, structure edits, bootstrap/disk persistence, and invalid-action no-write behavior.
- `.gsd/REQUIREMENTS.md` — recorded the new R008 runtime evidence.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S04 complete.
