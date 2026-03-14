# Project

## What This Is

SfRB (Straightforward Resume Builder) is an open-source resume editor that combines document editing, design-tool spatial control, and property inspection into a single unified interface. It runs as a local CLI tool that spawns a web-based editor, allowing for both human-driven GUI interactions and agent-driven CLI/API mutations on a universal document model.

## Core Value

The hybrid interaction model that treats the resume as a first-class spatial canvas with structured semantic data, enabling both design-level precision and AI-native automation without sacrificing ATS compatibility.

## Current State

Project initialized with Apache 2.0 license. S01 and S02 are complete: the repo now has a working `sfrb init` flow, a validated project-local `sfrb.config.json`, a canonical `resume.sfrb.json` document boundary, generated `schema.json`, and workspace-physics-aware document validation. The next milestone step is S03, which will open and live-sync this validated document model through a local web bridge.

## Architecture / Key Patterns

- **CLI-First**: All operations exposed via CLI for external agent accessibility.
- **Local Web Bridge**: CLI starts a local Node/Vite server to serve the browser UI.
- **Universal Document Model**: A JSON schema representing both semantic content (experience, skills) and spatial layout (x, y, w, h).
- **BYOK (Bring Your Own Key)**: User-provided LLM keys for AI features.
- **Layout Consultant**: AI detects layout conflicts (overflows) and suggests structural resolutions with previews.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Foundation & Physics — CLI, doc model, web bridge, and canvas physics.
- [ ] M002: Intelligence & Output — BYOK integration, AI layout consultant, and ATS-friendly PDF export.
- [ ] M003: Automation & Extensibility — Programmatic API, CLI parity, and template system.
- [ ] M004: Ecosystem — Style tiles, community presets, and advanced AI modules.
