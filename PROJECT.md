# Project

## What This Is

SfRB (Straightforward Resume Builder) is an open-source, local-first resume editor that combines document editing, design-tool spatial control, PDF export, templates, and optional AI layout suggestions around one canonical `resume.sfrb.json` document model.

The `sfrb` CLI creates and opens local workspaces. `sfrb open` starts a local web bridge and browser editor; `sfrb export` renders the canonical document through the shared print surface into a PDF.

## Core Value

The hybrid interaction model treats the resume as both structured semantic data and a spatial canvas. Users can make document-like edits, design-like layout adjustments, and AI-assisted overflow fixes without giving up local ownership, validation, or auditability.

## Current State

The main branch includes:

- workspace initialization with validated `sfrb.config.json` and `resume.sfrb.json`
- workspace physics validation for document/design behavior
- a local bridge and browser editor
- canonical browser mutation routes
- optional BYOK AI layout consultant proposals
- shared `/print` presentation surface
- browser and CLI PDF export
- first-party templates (`default`, `classic`, `modern`) with CLI and browser selection
- GitHub Actions CI for build, schema check, and tests

## Planning

Current planning lives in [`ROADMAP.md`](./ROADMAP.md), GitHub issues, and PR descriptions.

Historical `.gsd` planning artifacts were moved to [`docs/history/gsd/`](./docs/history/gsd/) for archive/reference only. Do not add new active planning there.
