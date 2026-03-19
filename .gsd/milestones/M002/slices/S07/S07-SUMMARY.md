# S07 Summary — CLI Editing Parity & Product Polish

S07 closes M002 at the shipped entrypoint. The canonical editor action model is now directly invokable through `dist/cli.js edit`, and the browser shell defaults to an editing-first posture with bridge/AI/consultant diagnostics demoted behind the workspace inspector. Together, T01–T03 retire the remaining direct-CLI gap in R009 and materially advance R011 with both automated evidence and a real-browser product-feel check.

## What Shipped

- **Direct CLI canonical action surface:** `sfrb edit` accepts one raw canonical action via `--action`, `--action-file`, or stdin and routes it through the same shared workspace action runner the bridge uses.
- **Normalized automation output:** default CLI output stays concise and human-readable, while `--json` emits one saved/no-write envelope with `code`, `writeOutcome`, `issues`, persistence paths, and optional reconciliation metadata.
- **Built-runtime CLI parity proof:** `scripts/verify-s07-cli-parity-smoke.mjs` proves representative direct `dist/cli.js edit` actions for text (`replace_block_text`), layout (`set_frame_box`), and reconciliation (`reconcile_freeform_exit`) against a real temp workspace while confirming the resulting state through command output, `/__sfrb/bootstrap`, and `resume.sfrb.json`.
- **Truthful no-write guard:** the S07 smoke script also proves a blocked `set_frame_box` action returns `action_invalid` / `writeOutcome: "no_write"` and leaves bootstrap plus disk state unchanged.
- **Calmer default shell:** the editor now leads with first-run guidance, lens selection, reconciliation, canvas state, and save status, while bridge/AI/consultant/diagnostics/payload surfaces stay mounted but collapsed behind `#workspace-inspector`.
- **Updated operator docs:** `README.md` now documents `dist/cli.js edit`, practical JSON input forms, concise vs `--json` output, and the direct S07 smoke verifier.

## Final Evidence

### Runtime and test proof passed

Ran from `/home/nlemo/SfRB/.gsd/worktrees/M002`:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts tests/cli/edit-command.test.ts tests/cli/open-command.test.ts tests/cli/init-command.test.ts` ✅
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/cli/edit-command.test.ts tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts` ✅
- `npm run build` ✅
- `node scripts/verify-s07-cli-parity-smoke.mjs` ✅

Observed shipped-runtime proof from `scripts/verify-s07-cli-parity-smoke.mjs`:

- `text:` `dist/cli.js edit --action` saved `replace_block_text` and bootstrap/disk converged
- `layout:` `dist/cli.js edit --action-file --json` saved `set_frame_box` and bootstrap/disk converged
- `reconciliation:` stdin-fed `dist/cli.js edit --json` saved `reconcile_freeform_exit` and exposed reconciliation metadata
- `failure:` a blocked locked-group frame move returned `action_invalid` / `no_write` and left `/__sfrb/bootstrap` plus `resume.sfrb.json` stable

### Product-feel / UAT check

Opened a built local bridge in a real browser on a template design workspace and confirmed:

- the first impression is editing-first rather than diagnostics-first
- `#workspace-inspector` starts collapsed with `data-inspector-state="collapsed"`
- the three editing lenses and the main canvas dominate the default shell
- the inspector summary still advertises access to bridge, AI, consultant, and payload details when needed

### Requirement status after S07

- **R009** validated — direct CLI invocation parity is now proven at the shipped `dist/cli.js edit` entrypoint.
- **R011** remains active but materially evidenced — the calmer shell now ships and browser/UAT verification passed, but product sleekness remains a quality attribute with ongoing human judgment rather than something automation can retire forever.

## Primary Inspection Surfaces

- `src/editor/workspace-action-runner.ts` — one shared CLI/bridge canonical mutation runner
- `src/commands/edit.ts` — shipped direct CLI action command
- `scripts/verify-s07-cli-parity-smoke.mjs` — authoritative shipped-runtime proof for direct CLI parity and no-write guarantees
- `README.md` — real-user/operator examples for `dist/cli.js edit`
- `/__sfrb/bootstrap` — bridge-visible persisted workspace state after CLI edits
- `resume.sfrb.json` — canonical disk state after CLI edits or no-write failures
- `#workspace-inspector` and `#workspace-inspector-summary` — calmer default shell + preserved secondary observability
- `.gsd/REQUIREMENTS.md` and `.gsd/milestones/M002/M002-ROADMAP.md` — formal requirement/roadmap closure for M002

## Files of Record

- `scripts/verify-s07-cli-parity-smoke.mjs`
- `README.md`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M002/M002-ROADMAP.md`
- `.gsd/milestones/M002/slices/S07/tasks/T01-SUMMARY.md`
- `.gsd/milestones/M002/slices/S07/tasks/T02-SUMMARY.md`
- `.gsd/milestones/M002/slices/S07/tasks/T03-SUMMARY.md`
