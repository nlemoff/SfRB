# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

## Active

### R001 — Hybrid Interaction Model
- Class: primary-user-loop
- Status: active
- Description: Users can interact with the resume via direct canvas typing, spatial element selection/dragging, and a property inspector panel simultaneously.
- Why it matters: Core differentiator; removes the mode-switching friction of traditional builders.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S03
- Validation: mapped
- Notes: Requires a document model that handles text flow and absolute positioning.

### R002 — CLI-First Architecture
- Class: core-capability
- Status: active
- Description: The tool is primarily a CLI application that manages local resume files and can perform all document operations without a GUI.
- Why it matters: Enables agentic workflows and local ownership.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M003/S02
- Validation: mapped
- Notes: Essential for external tool integration (e.g. Claude Code).

### R003 — Local Web Editor (Vite/Browser)
- Class: integration
- Status: active
- Description: Running `sfrb open` launches a local dev server that serves the full visual editor in the user's default browser.
- Why it matters: Provides a high-fidelity GUI without the overhead of Electron or central hosting.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: mapped
- Notes: Needs a robust bridge between the local filesystem and the browser.

### R005 — BYOK AI Agent Integration
- Class: differentiator
- Status: active
- Description: Users provide their own AI API keys to power resume optimization, scoring, and generation features.
- Why it matters: Zero-cost for maintainer; maximum privacy and control for user.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: M001/S01
- Validation: mapped
- Notes: Requires secure local credential management.

### R006 — Layout Consultant (AI Previews)
- Class: primary-user-loop
- Status: active
- Description: AI detects when text overflows a fixed box and suggests/previews multiple structural resolutions (shrink text, move elements, etc.).
- Why it matters: Solves the "broken design" problem of absolute positioning tools.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: M002/S02
- Validation: mapped
- Notes: High technical risk; needs "ghost" document state for previews.

### R008 — PDF Export (ATS Friendly)
- Class: launchability
- Status: active
- Description: Generates high-quality PDF files that are correctly parsed by common Applicant Tracking Systems (ATS).
- Why it matters: The primary output of the tool must be functional for job applications.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: mapped
- Notes: Often at odds with design-heavy layouts; needs careful semantic mapping.

### R009 — Agent-Accessible Workspace API
- Class: operability
- Status: active
- Description: The workspace state and document model are accessible via a programmatic interface or CLI commands for external agents.
- Why it matters: Enables fully automated resume tailoring pipelines.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: mapped
- Notes: The CLI is the primary "API" for now.

## Validated

### R004 — Configurable Workspace Physics
- Class: differentiator
- Status: validated
- Description: Users can configure if the document behaves like a word processor (reflow) or a design tool (fixed boxes) at the workspace level.
- Why it matters: Adapts to different user mental models and design needs.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S01
- Validation: integration
- Notes: Validated at the shared document boundary: `readWorkspaceDocument()` now changes acceptance rules based on `workspace.physics`, with real temp-workspace tests and smoke coverage proving document-mode and design-mode divergence.

## Deferred

### R007 — Style Tiles & Presets
- Class: core-capability
- Status: deferred
- Description: Reusable bundles of attributes (fonts, colors, spacing) that can be applied to elements.
- Why it matters: Consistency and speed of design.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred to M002/M003 to focus on foundation.

### R010 — Community Preset Packs
- Class: differentiator
- Status: deferred
- Description: A system for browsing and importing shared templates and style tiles from the community.
- Why it matters: Scalability and value-add for non-designers.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Belongs in later ecosystem milestones.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | active | M001/S04 | M001/S03 | mapped |
| R002 | core-capability | active | M001/S01 | M003/S02 | mapped |
| R003 | integration | active | M001/S03 | none | mapped |
| R004 | differentiator | validated | M001/S02 | M001/S01 | integration |
| R005 | differentiator | active | M002/S01 | M001/S01 | mapped |
| R006 | primary-user-loop | active | M001/S05 | M002/S02 | mapped |
| R008 | launchability | active | M002/S03 | none | mapped |
| R009 | operability | active | M003/S01 | none | mapped |
| R007 | core-capability | deferred | none | none | unmapped |
| R010 | differentiator | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 7
- Mapped to slices: 7
- Validated: 1
- Unmapped active requirements: 0
