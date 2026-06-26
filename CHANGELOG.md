# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Release notes are generated automatically from Conventional Commit messages via release-please.

## 1.0.0 (2026-06-26)


### Features

* add DeepSeek default and mainline CI ([#17](https://github.com/nlemoff/SfRB/issues/17)) ([01da905](https://github.com/nlemoff/SfRB/commit/01da9050e6066e2555236af3ff04772b5197e606))
* finish the app — three-lens editor, structured operations, reconciliation, a11y ([#19](https://github.com/nlemoff/SfRB/issues/19)) ([206de74](https://github.com/nlemoff/SfRB/commit/206de74ec03b9d1759055c10808f754952b195bf))
* **M001/S01:** CLI & Config Agent ([26fe9bf](https://github.com/nlemoff/SfRB/commit/26fe9bfd97884ec0bc962ed8da73f97312a9a668))
* **M001/S03:** Local Web Bridge ([2d6491b](https://github.com/nlemoff/SfRB/commit/2d6491bd6b33dc78620f781f8a0a06c3a45bbd5f))
* **M002/S01:** Template Starts & First-Run Guidance ([0fb1fa0](https://github.com/nlemoff/SfRB/commit/0fb1fa04e62199546766accdacd6641108cdfc34))
* **M004/S02:** named templates, sfrb template CLI, and browser picker ([#12](https://github.com/nlemoff/SfRB/issues/12)) ([1ab727e](https://github.com/nlemoff/SfRB/commit/1ab727e07cfd7e0b6a6e460713250ab7d73160c4))
* **M004/S03:** preview polish, contributor docs, assembled proof ([#16](https://github.com/nlemoff/SfRB/issues/16)) ([c350e26](https://github.com/nlemoff/SfRB/commit/c350e2611bed8ffb2fd9298d0300bff6dfaca70f))
* raise agent readiness to Level 5 and remove gsd workflow ([#22](https://github.com/nlemoff/SfRB/issues/22)) ([bc69d75](https://github.com/nlemoff/SfRB/commit/bc69d750f7e9260a65fb17b03db56286c137e115))
* **ui:** one-shot UI/UX refresh — tokens, pills, motion, desk canvas, zoom ([#21](https://github.com/nlemoff/SfRB/issues/21)) ([a2f8809](https://github.com/nlemoff/SfRB/commit/a2f8809f9f7aceda437a49207deca69a3bce3632))


### Bug Fixes

* address PR review feedback ([b5920ac](https://github.com/nlemoff/SfRB/commit/b5920ac88753dbb081f1b3a3511dce18f66adda4))
* **canvas:** tighten design-frame layout, print bullets; add UI refresh direction ([#20](https://github.com/nlemoff/SfRB/issues/20)) ([a63e507](https://github.com/nlemoff/SfRB/commit/a63e5072f52c334b9e7ac8d723e67146ed5208d5))
* remove accidental nested SfRB gitlink ([c186814](https://github.com/nlemoff/SfRB/commit/c1868140cd3c3b715f28478bfee49faa0be0790b))
* restore .gsd/STATE.md and re-track in git ([8106497](https://github.com/nlemoff/SfRB/commit/81064976066a3b6ad4f32beae3414666b89d563a))

## [Unreleased]

### Added

- Agent-readiness tooling: ESLint flat config, Prettier, knip, jscpd, tech-debt and large-file guards.
- Pre-commit hooks via husky + lint-staged.
- Test coverage thresholds, CI retry for flaky-test mitigation, and JUnit timing output.
- Structured, secret-redacting logger and an in-process Prometheus metrics registry.
- Bridge observability endpoints: `GET /__sfrb/health` and `GET /__sfrb/metrics`, plus `x-request-id` correlation on every `/__sfrb/*` response.
- Contributor and operational documentation: `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, architecture, bridge API, observability, privacy, testing docs, runbooks, and ADRs.
- Developer environment and automation: devcontainer, CODEOWNERS, issue/PR templates, Dependabot, CodeQL, and release automation.

[Unreleased]: https://github.com/nlemoff/SfRB/compare/main...HEAD
