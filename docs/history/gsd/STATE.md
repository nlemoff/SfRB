# GSD State

**Active Milestone:** Post-M004 — planning next milestone
**Phase:** handoff
**Requirements Status:** 8 active · 8 validated · 2 deferred · 0 out of scope

## Milestone Registry
- ✅ **M001:** Foundation & Physics
- ✅ **M002:** Resume Engine & Guided Editing
- ✅ **M003:** Export & Presentation Depth
- ✅ **M004:** Template & Presentation System

## Recent Decisions
- D031: Keep M001/M002 fixed and add a contributor-facing build plan plus contributor-track annotations for M003+.
- D032: Document-level template metadata (`document.metadata.template = { id, version }`) over workspace-config storage so the canonical document remains self-describing.
- D033: Single canonical template registry in `src/document/templates/registry.ts`; web `TEMPLATE_REGISTRY` parity is enforced at compile time via `satisfies Record<TemplateId, Theme>`.
- D034: Template chrome is preview-only (`/print` shows a "Template · `<id>`" line in the diagnostics band); `/print?mode=artifact` stays chrome-free with marker compatibility intact.
- D035: `Theme` shape forbids geometry overrides (page size, margins, frame boxes) so future templates cannot silently break the M003 export trust contract.

## Blockers
- None

## Next Action
Merge M004 into DEV, then plan the next milestone (M005: Distribution, Automation & Ecosystem is provisional).
