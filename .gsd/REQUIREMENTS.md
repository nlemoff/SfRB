# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

Guidelines:
- Keep requirements capability-oriented, not a giant feature wishlist.
- Requirements should be atomic, testable, and stated in plain language.
- Every **Active** requirement should be mapped to a slice, deferred, blocked with reason, or moved out of scope.
- Each requirement should have one accountable primary owner and may have supporting slices.
- Research may suggest requirements, but research does not silently make them binding.
- Validation means the requirement was actually proven by completed work and verification, not just discussed.

## Active

### R007 — Template and blank-canvas start
- Class: launchability
- Status: active
- Description: A user can begin a resume either from one strong starter template with tiles already assembled into a full resume or from a blank canvas.
- Why it matters: The product should create immediate value for a non-technical user who wants to make a good resume fast, while still leaving room for users who want to build from scratch.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: M002/S03
- Validation: mapped
- Notes: The first shipped template path should be stronger than broad template variety; a default path matters more than a gallery at this stage.

### R008 — Three-mode guided editing
- Class: primary-user-loop
- Status: active
- Description: The editor supports text mode, tile mode, and freeform mode as intentional editing lenses over one canonical resume model, with straightforward direction on how to use each mode.
- Why it matters: The core product promise is that different kinds of users can shape the same resume through the interaction style that fits them best.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: M002/S04, M002/S05, M002/S06
- Validation: mapped
- Notes: Guidance is part of the feature, not decorative copy; the product should help a layman understand the best flow.

### R009 — Canonical structured editor actions
- Class: integration
- Status: active
- Description: Every meaningful editor action is representable as a structured mutation over the canonical resume model and invokable through the CLI as well as the browser.
- Why it matters: The browser is the primary human experience, but the system must remain fully scriptable and agent-ready without forking the product into separate editing models.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: M002/S07
- Validation: mapped
- Notes: This is action/model parity, not a promise that the CLI must be the most comfortable UX for normal users.

### R011 — Sleek minimalist editor presentation
- Class: quality-attribute
- Status: active
- Description: The product presents a sleek and minimalist editing experience rather than feeling visually raw, overly technical, or cluttered.
- Why it matters: Product trust depends on the experience feeling deliberate and calm, especially for non-technical users.
- Source: user
- Primary owning slice: M002/S07
- Supporting slices: M002/S01, M002/S04, M002/S05
- Validation: mapped
- Notes: The product should not feel like a toy design tool, a dev-facing JSON editor with a UI bolted on, or a brittle WYSIWYG.

### R012 — Mode reconciliation without surprise
- Class: constraint
- Status: active
- Description: Switching between text, tile, and freeform modes uses explicit, understandable reconciliation rules so content does not jump or silently rewrite in confusing ways.
- Why it matters: The biggest engine risk in the three-mode design is loss of trust when the same resume can be edited through multiple lenses.
- Source: user
- Primary owning slice: M002/S06
- Supporting slices: M002/S03, M002/S04, M002/S05
- Validation: mapped
- Notes: Freeform edits must be able to rejoin document logic or remain intentionally locked, based on an explicit policy.

### R013 — PDF export matches built resume
- Class: core-capability
- Status: active
- Description: The common path exports a clean PDF that matches what the user built in the editor, especially for the one-page resume case.
- Why it matters: The editor is not complete until a user can produce a real resume artifact from it.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none yet
- Validation: mapped
- Notes: Stronger pagination/print controls can deepen later, but the first bar is reliable WYSIWYG-style export for common use.

### R014 — Element-level freeform editing surface
- Class: core-capability
- Status: active
- Description: Freeform mode lets the user select and manipulate individual page elements such as text boxes, bullets, lines, and dividers rather than only moving coarse sections.
- Why it matters: The freeform editor should feel like a real Figma/Acrobat-style surface, not just a slightly looser section mover.
- Source: user
- Primary owning slice: M002/S05
- Supporting slices: M002/S06
- Validation: mapped
- Notes: “Anything on the page” is the guiding idea, even if the first shipped set of element types is staged.

### R015 — Tile grouping and locking model
- Class: differentiator
- Status: active
- Description: Fine-grained tiles can be split as needed, moved independently, and locked together into larger resume compositions.
- Why it matters: This is the distinctive middle interaction model between pure text flow and fully freeform layout.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: M002/S06
- Validation: mapped
- Notes: Tiles are intentionally smaller than whole resume sections; they can be line-level or otherwise decomposed into smaller pieces.

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

### R010 — Non-technical first-run value
- Class: primary-user-loop
- Status: validated
- Description: A non-technical user can open the app, replace template content with their own resume content, and get immediate basic value without configuring AI.
- Why it matters: The first optimized user is someone who is not that technical and should still be able to make a good resume fast.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: M002/S06, M002/S07
- Validation: validated
- Notes: Proven by S01 through AI-optional `sfrb init`, guidance-first `sfrb open`, browser/runtime persistence checks for both starter variants, and the shipped `scripts/verify-s01-first-run.mjs` loop.

## Deferred

### R016 — AI-assisted resume authoring and layout guidance
- Class: differentiator
- Status: deferred
- Description: The product uses AI to help shape resume content or layout beyond the existing M001 consultant behavior.
- Why it matters: It may become an important differentiator later, but it is not the center of the next milestone.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: The user explicitly chose to de-feature building the agent into the product for now and focus on the resume editor engine first.

### R017 — User-facing provider/model configuration beyond core editing
- Class: operability
- Status: deferred
- Description: Users can manage provider choice, model choice, and richer AI settings as part of the product experience.
- Why it matters: It could matter later if AI becomes more central again, but it is intentionally not driving M002.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: OpenRouter and cheap-model exploration were intentionally deprioritized once the product direction shifted toward editor usability and away from AI in M002.

## Out of Scope

None.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R007 | launchability | active | M002/S01 | M002/S03 | mapped |
| R008 | primary-user-loop | active | M002/S01 | M002/S04, M002/S05, M002/S06 | mapped |
| R009 | integration | active | M002/S02 | M002/S07 | mapped |
| R010 | primary-user-loop | validated | M002/S01 | M002/S06, M002/S07 | validated |
| R011 | quality-attribute | active | M002/S07 | M002/S01, M002/S04, M002/S05 | mapped |
| R012 | constraint | active | M002/S06 | M002/S03, M002/S04, M002/S05 | mapped |
| R013 | core-capability | active | M003/S01 | none yet | mapped |
| R014 | core-capability | active | M002/S05 | M002/S06 | mapped |
| R015 | differentiator | active | M002/S03 | M002/S06 | mapped |
| R001 | primary-user-loop | validated | M001/S05 | M001/S02, M001/S03, M001/S04 | validated |
| R002 | launchability | validated | M001/S01 | none | validated |
| R003 | integration | validated | M001/S03 | M001/S04 | validated |
| R004 | core-capability | validated | M001/S04 | M001/S03 | validated |
| R005 | constraint | validated | M001/S02 | M001/S03, M001/S04 | validated |
| R006 | differentiator | validated | M001/S05 | M001/S04 | validated |
| R016 | differentiator | deferred | none | none | unmapped |
| R017 | operability | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 8
- Mapped to slices: 8
- Validated: 7
- Unmapped active requirements: 0
