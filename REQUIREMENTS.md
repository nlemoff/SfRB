# Requirements

This file is a lightweight capability overview for the current codebase. Keep active roadmap details in [`ROADMAP.md`](./ROADMAP.md) and use GitHub issues/PRs for scoped implementation work.

## Active capability contract

### R001 — Hybrid Interaction Model

Users can interact with the resume through document-style editing, design-style spatial control, and structured UI controls against the same canonical document model.

### R002 — CLI-First Architecture

The tool is a CLI-managed local workspace. Core flows are exposed through `sfrb init`, `sfrb open`, `sfrb export`, and `sfrb template ...` commands.

### R003 — Local Web Editor

Running `sfrb open` launches a local bridge that serves the browser editor and reconciles state from `resume.sfrb.json`.

### R004 — Configurable Workspace Physics

Workspaces can validate resume documents under document/design physics rules stored in `sfrb.config.json`.

### R005 — BYOK AI Agent Integration

AI layout suggestions are optional and driven by provider API keys stored in environment variables. Provider secrets stay bridge-side and are never sent to the browser.

### R006 — Layout Consultant

The layout consultant can propose overflow fixes, expose preview/ghost state, and persist accepted changes through the canonical write path.

### R007 — PDF Export

SfRB exports from the shared `/print` presentation surface, not from editor chrome. Exports are gated by readiness/overflow markers.

### R008 — Template System

First-party templates are registered in source, surfaced in the browser picker, and manageable through `sfrb template list/show/apply`.

### R009 — Agent-Accessible Workspace Operations

External agents can inspect and mutate workspaces through local files and CLI commands while preserving schema/physics validation boundaries.

## Deferred / future work

- broader template catalog and third-party template loading
- multi-page pagination / reflow
- custom paper sizes and deeper print controls
- richer AI presentation/design assistance
- packaging and distribution polish
