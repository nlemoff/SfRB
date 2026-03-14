# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | distribution | Local CLI + Browser UI | Node.js + Vite | Avoids native app bloat, leverages user's browser, enables CLI parity. | No |
| D002 | M001 | data | BYOK AI Integration | OpenAI/Anthropic keys | Privacy, user ownership, and zero operational cost. | Yes |
| D003 | M001 | arch | Configurable Physics | Doc-style vs Design-style | Adapts to different user mental models for layout. | Yes |
| D004 | M001 | arch | AI Layout Consultant | Fixed boxes + Previews | Solves "broken design" of spatial tools without taking away control. | No |
| D005 | M001 | data | Document Format | JSON-based Semantic + Spatial | Enables CLI/GUI parity and agent-friendliness. | No |
| D006 | M001 | cli | CLI stack for init/config | Commander + Enquirer + Zod + project-local config store | Gives S01 a conventional CLI surface, masked prompts, and a stable validated config boundary for later slices. | Yes |
| D007 | M001 | config | S01 config contract | `sfrb.config.json` stores provider + provider-specific env-var name + workspace physics, with `document` as the default physics mode | Keeps secrets out of the config file itself while giving later CLI/web slices one validated workspace-local contract to consume. | Yes |
| D008 | M001 | cli | Init automation path | Drive automated init coverage through `SFRB_INIT_TEST_INPUT` so tests and smoke runs execute the real command flow without faking prompt internals | Preserves a real Enquirer wizard for users while giving agents a stable non-TTY harness that still exercises command persistence, redaction, and gitignore behavior. | Yes |
