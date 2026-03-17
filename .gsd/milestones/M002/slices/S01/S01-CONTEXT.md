---
id: S01
milestone: M002
status: ready
---

# S01: Template Starts & First-Run Guidance — Context

## Goal

Deliver a first-run experience where a user explicitly chooses between a strong starter resume and a blank canvas, then receives concise product-language guidance that makes the three editing modes feel approachable instead of technical.

## Why this Slice

This slice comes first because it establishes the human-facing starting point for the entire M002 editor experience and gives downstream work a concrete entry contract, starter metadata, and guidance surface to build on. It also immediately addresses the current gap where the browser shell reads as a technical bridge/editor surface rather than something a non-technical user can trust and begin using quickly.

## Scope

### In Scope

- A clear first-run chooser that presents starter template vs blank canvas as an explicit up-front decision before editing begins.
- A starter resume that feels strong, realistic, and worth editing line by line rather than a sparse placeholder skeleton.
- Concise first-run onboarding in product language that explains text mode, tile mode, and freeform mode without sounding like developer diagnostics.
- Guidance that gets out of the way after orienting the user, rather than becoming a permanent heavy instructional surface.
- Stable starter/blank entry identifiers or metadata that later slices can target through the canonical workspace boundary.

### Out of Scope

- Defining the technical implementation of the starter-workspace contract, action model, or persistence architecture.
- Rich persistent help systems, extensive tutorials, or deep mode-specific training beyond lightweight first-run orientation.
- Settling reconciliation behavior, tile decomposition rules, or freeform editing semantics that belong to later slices.
- Using AI setup, provider configuration, or model-related UX as part of the first-run value path.

## Constraints

- Must preserve the existing local-first canonical workspace/document boundary and feed downstream S02 consumers through stable template/blank metadata.
- Must optimize for a non-technical user who should be able to get immediate basic value without AI configuration.
- Must make the browser experience feel materially less technical than the current bridge/editor shell.
- The first-run choice should be explicit: do not silently force users into a template-first or editor-first path for S01.
- Guidance should be short and lightweight, not a persistent instructional panel by default.

## Integration Points

### Consumes

- `src/bridge/server.mjs` + `/__sfrb/bootstrap` — existing canonical bootstrap surface that S01 should extend for starter/blank entry behavior rather than bypass.
- `web/src/App.tsx` — current browser shell that still presents technical bridge-oriented language and is the likely surface for first-run entry and guidance changes.
- `web/src/editor/Canvas.tsx` — current editor surface whose existing document/design explanatory text establishes the baseline that S01 should translate into more product-facing mode guidance.
- `resume.sfrb.json` / `sfrb.config.json` workspace boundary — canonical local workspace contract the start flows must respect.

### Produces

- Starter-workspace entry behavior for choosing a realistic starter resume or blank canvas before editing.
- First-run guidance surface that explains text mode, tile mode, and freeform mode in concise product language.
- Stable starter-template and blank-canvas metadata/identifiers for downstream action and mode work.
- A clearer non-technical-user entry experience that later slices can layer real mode capabilities onto.

## Open Questions

- How much of the guidance should remain accessible after dismissal? — Current thinking: first-run guidance should be short and dismissible, but planning may still need a lightweight way to re-open or revisit it.
- What exactly makes the starter resume feel “strong” enough? — Current thinking: it should look polished and believable, with realistic content that invites direct replacement rather than generic filler.
- How visually prominent should the initial template-vs-blank choice be inside the overall shell? — Current thinking: the choice should feel immediate and obvious, but the final presentation style still needs planning work.
