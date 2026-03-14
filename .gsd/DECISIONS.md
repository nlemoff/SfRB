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
