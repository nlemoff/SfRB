# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated, what is intentionally deferred, and what is explicitly out of scope.

Guidelines:
- Keep requirements capability-oriented, not a giant feature wishlist.
- Requirements should be atomic, testable, and stated in plain language.
- Every **Active** requirement should be mapped to a slice, deferred, blocked with reason, or moved out of scope.
- Each requirement should have one accountable primary owner and may have supporting slices.
- Research may suggest requirements, but research does not silently make them binding.
- Validation means the requirement was actually proven by completed work and verification, not just discussed.

## Active

None.

## Validated

### R001 — Canonical local authoring loop
- Class: primary-user-loop
- Status: validated
- Description: A user can open a local workspace and edit the canonical resume model through the shipped CLI/browser flow without state drift between the browser, bridge, and on-disk JSON document.
- Why it matters: This is the main product loop; if the editor is not reliably operating on the canonical local document, the tool loses trust immediately.
- Source: inferred
- Primary owning slice: M001/S05
- Supporting slices: M001/S02, M001/S03, M001/S04
- Validation: validated
- Notes: Fully proven by S05 through the real `dist/cli.js open` runtime, including direct browser editing from S04 plus consultant reject/no-write, accept/persist, bootstrap reconciliation, and failure-path no-drift behavior.

### R006 — AI layout consultant proposals
- Class: differentiator
- Status: validated
- Description: The system detects layout overflow in fixed-layout workspaces and presents a visible suggested fix that the user can accept or reject.
- Why it matters: This is the project’s differentiating promise beyond a standard local editor.
- Source: inferred
- Primary owning slice: M001/S05
- Supporting slices: M001/S04
- Validation: validated
- Notes: Proven by S05 through bridge contract tests, browser runtime tests, and built-path smoke verification showing overflow detection, visible ghost preview, explicit reject/no-write behavior, accept/persist behavior, overflow clearing after accept, and categorized provider-failure visibility.

### R002 — Workspace initialization captures local config and physics
- Class: launchability
- Status: validated
- Description: `sfrb init` captures provider setup and workspace physics into a validated local config contract without storing secret values in the config file itself.
- Why it matters: The rest of the workflow depends on a stable workspace contract and a safe secret boundary.
- Source: inferred
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: validated
- Notes: Proven by S01 command, config persistence, and init smoke/test coverage.

### R003 — Local bridge opens the workspace in the browser
- Class: integration
- Status: validated
- Description: `sfrb open` launches the local bridge, serves the canonical workspace document to the browser, and propagates workspace changes without restart.
- Why it matters: The browser editor only matters if the real shipped CLI path reliably reaches it.
- Source: inferred
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: validated
- Notes: Proven by the built `dist/cli.js open` path, bridge live-sync tests, and S03/S04/S05 smoke verification.

### R004 — Mode-aware browser editing persists valid document changes
- Class: core-capability
- Status: validated
- Description: Document-mode workspaces allow inline text editing without drag affordances, and design-mode workspaces allow frame dragging plus linked text editing, with changes persisted back to `resume.sfrb.json` through validated writes.
- Why it matters: This is the main user-visible editing capability for M001.
- Source: inferred
- Primary owning slice: M001/S04
- Supporting slices: M001/S03
- Validation: validated
- Notes: Proven by the bridge editor contract test, document/design browser tests, and `scripts/verify-s04-editor-smoke.mjs`.

### R005 — Canonical document and physics validation boundary
- Class: constraint
- Status: validated
- Description: The canonical resume document shape and workspace physics rules are enforced before local persistence and exposed with path-aware diagnostics when invalid.
- Why it matters: The editor and bridge need a trustworthy write boundary so invalid state does not silently corrupt the canonical document.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S04
- Validation: validated
- Notes: Proven by schema generation/checks, document validation tests, S04 invalid-mutation rejection coverage through `/__sfrb/editor`, and S05 consultant no-write guarantees on rejected or failed proposals.

## Deferred

None yet.

## Out of Scope

None yet.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | validated | M001/S05 | M001/S02, M001/S03, M001/S04 | validated |
| R006 | differentiator | validated | M001/S05 | M001/S04 | validated |
| R002 | launchability | validated | M001/S01 | none | validated |
| R003 | integration | validated | M001/S03 | M001/S04 | validated |
| R004 | core-capability | validated | M001/S04 | M001/S03 | validated |
| R005 | constraint | validated | M001/S02 | M001/S03, M001/S04 | validated |

## Coverage Summary

- Active requirements: 0
- Mapped to slices: 0
- Validated: 6
- Unmapped active requirements: 0
