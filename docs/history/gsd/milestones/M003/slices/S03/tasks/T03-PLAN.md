---
estimated_steps: 4
estimated_files: 3
---

# T03: Publish the final S03 and milestone handoff after proof passes

**Slice:** S03 — Presentation Depth & Final Export Assembly
**Milestone:** M003

## Description

Freeze the milestone truth after the product and proof work are real. This task should update the roadmap, the contributor-facing build plan, and create the final S03 summary only after T01 and T02 verification pass, so future contributors and the eventual PR into `DEV` inherit an honest description of what M003 now guarantees.

Relevant skills to load before implementation: none required; `frontend-design` may help keep polish language concise and product-facing if useful.

## Steps

1. Read the final outputs of T01 and T02 and capture the exact shipped boundary: what changed in presentation polish, what the assembled browser-edit → shared-preview → CLI-export proof now covers, and which non-goals still remain deferred.
2. Update `.gsd/milestones/M003/M003-ROADMAP.md` so S03 is marked complete with a concise boundary/handoff statement that reflects the finished milestone rather than future intent.
3. Refresh `OPEN_SOURCE_BUILD_PLAN.md` to describe M003 as complete, tighten the contributor guidance for post-M003 work, and keep the public lane story aligned with the final shipped trust contract.
4. Write `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md` with outcome, guarantees, verification anchors, key files, and a PR-ready summary paragraph suitable for the final merge into `DEV`.

## Must-Haves

- [ ] Documentation updates happen after T01/T02 proof, not ahead of code.
- [ ] Roadmap, build plan, and S03 summary all describe the same finished milestone boundary.
- [ ] The S03 summary includes PR-ready language that a contributor can reuse without replaying internal planning docs.
- [ ] Remaining non-goals stay explicit so later milestones do not accidentally imply multi-page pagination or deeper export controls are already shipped.

## Verification

- Read `.gsd/milestones/M003/M003-ROADMAP.md`, `OPEN_SOURCE_BUILD_PLAN.md`, and `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md` together and confirm they all describe the same completed S03 boundary and verification anchors.
- Sanity check that the referenced automated proof exists and matches the shipped filenames: `tests/web/export-assembly.test.ts` and `scripts/verify-m003-s03-export-assembly.mjs`.

## Observability Impact

- Signals changed: contributor-facing truth surfaces become the milestone observability layer for M003 completion, so the roadmap, build plan, and S03 summary must all name the same shipped guarantees, proof anchors, and deferred non-goals.
- How to inspect later: read `.gsd/milestones/M003/M003-ROADMAP.md`, `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md`, `tests/web/export-assembly.test.ts`, and `scripts/verify-m003-s03-export-assembly.mjs` together; the docs should point to the same browser-edit → shared-preview → CLI-export contract and the same verification files.
- Failure state made visible: if milestone handoff drifts, a future agent will now be able to detect it as inconsistent wording about S03 completion, missing/non-matching proof filenames, or accidental claims that multi-page pagination / deeper export controls are already shipped.

## Inputs

- `.gsd/milestones/M003/M003-ROADMAP.md` and `OPEN_SOURCE_BUILD_PLAN.md` — current contributor-facing handoff artifacts to refresh.
- T01 output — final presentation polish boundary and preserved marker contract.
- T02 output — final assembled acceptance test and built-runtime smoke verifier to cite truthfully.
- `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md`, `.gsd/milestones/M003/slices/S02/S02-SUMMARY.md` — prior slice summaries to keep the milestone narrative consistent.

## Expected Output

- `.gsd/milestones/M003/M003-ROADMAP.md` — S03 marked complete with final milestone handoff language.
- `OPEN_SOURCE_BUILD_PLAN.md` — contributor-facing roadmap updated for a finished M003 and clearer post-M003 direction.
- `.gsd/milestones/M003/slices/S03/S03-SUMMARY.md` — final S03 handoff and PR-ready summary artifact.
