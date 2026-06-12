// Every id / data-testid in this markup is part of the frozen selector
// contract relied on by tests/ and scripts/verify-*.mjs. Move elements
// freely; never rename or drop them.
export function createShellMarkup(): string {
  return `
    <div class="sfrb-shell">
      <header class="sfrb-header">
        <h1><span class="sfrb-wordmark">SfRB</span> · Straightforward Resume Builder</h1>
        <div class="sfrb-chip-row">
          <div id="starter-chip" data-testid="starter-chip" data-starter-kind="loading" class="sfrb-chip">Starter · loading</div>
          <div id="workspace-ai-chip" data-testid="workspace-ai-chip" data-ai-status="loading" class="sfrb-chip">AI · loading</div>
        </div>
      </header>

      <section id="first-run-guidance" data-testid="first-run-guidance" class="sfrb-panel sfrb-guidance" aria-label="First-run guidance">
        <div>
          <div class="sfrb-kicker">Canonical workspace</div>
          <h2>One saved resume, edited through the lens that fits.</h2>
          <p id="starter-guidance" data-testid="starter-guidance">Loading starter guidance…</p>
        </div>
        <div class="sfrb-starter-card">
          <div class="sfrb-kicker">Starter on disk</div>
          <strong id="starter-kind" data-testid="starter-kind">Loading…</strong>
          <div id="starter-id" data-testid="starter-id">Waiting for starter metadata…</div>
        </div>
      </section>

      <div id="editing-lenses" data-testid="editing-lenses" class="sfrb-lens-switcher" role="radiogroup" aria-label="Editing lens" data-active-lens="text">
        <button type="button" role="radio" aria-checked="false" id="lens-pick-text" data-testid="lens-text" data-lens="text" class="sfrb-lens-option">
          <span class="sfrb-lens-name">Text</span>
          <span class="sfrb-note">Rewrite the actual words.</span>
          <span class="sfrb-lens-availability" data-testid="lens-text-availability">Available now</span>
        </button>
        <button type="button" role="radio" aria-checked="false" id="lens-pick-tile" data-testid="lens-tile" data-lens="tile" class="sfrb-lens-option">
          <span class="sfrb-lens-name">Tile</span>
          <span class="sfrb-note">Move, split, and group placed blocks.</span>
          <span class="sfrb-lens-availability" id="tile-lens-availability" data-testid="lens-tile-availability">Checking current workspace…</span>
        </button>
        <button type="button" role="radio" aria-checked="false" id="lens-pick-freeform" data-testid="lens-freeform" data-lens="freeform" class="sfrb-lens-option">
          <span class="sfrb-lens-name">Freeform</span>
          <span class="sfrb-note">Manipulate any element on the page.</span>
          <span class="sfrb-lens-availability" data-testid="lens-freeform-availability">Checking current workspace…</span>
        </button>
      </div>

      <div id="editor-mode-transition-strip" data-testid="editor-mode-transition-strip" data-outcome="" role="status" hidden class="sfrb-transition-strip"></div>

      <main class="sfrb-columns">
        <section class="sfrb-panel sfrb-canvas-panel" aria-label="Editor canvas">
          <div id="editor-host"></div>
        </section>

        <aside class="sfrb-rail" aria-label="Workspace panels">
          <section id="editor-save-status" data-testid="editor-save-status" data-save-state="idle" class="sfrb-panel sfrb-rail-panel" aria-live="polite">
            <h3>Editor save state</h3>
            <div id="editor-save-state-label" class="sfrb-strong-line">idle</div>
            <div id="editor-save-error" data-testid="editor-save-error" class="sfrb-note">No save errors recorded.</div>
          </section>

          <section id="consultant-panel" data-testid="consultant-panel" data-consultant-state="idle" data-consultant-code="none" class="sfrb-panel sfrb-rail-panel">
            <h3>AI layout consultant</h3>
            <div id="consultant-status" data-testid="consultant-status" data-consultant-state="idle" class="sfrb-strong-line">idle</div>
            <div id="consultant-state-note" data-testid="consultant-state-note" class="sfrb-note">Select a design frame to inspect overflow.</div>
            <div class="sfrb-fact-grid">
              <div class="sfrb-fact">
                <div class="sfrb-kicker">Overflow</div>
                <div id="consultant-overflow-status" data-testid="consultant-overflow-status" data-overflow-status="idle">idle</div>
              </div>
              <div class="sfrb-fact">
                <div class="sfrb-kicker">Proposal frame</div>
                <div id="consultant-frame-id" data-testid="consultant-frame-id" data-frame-id="">None</div>
              </div>
            </div>
            <div id="consultant-measurements" data-testid="consultant-measurements" data-overflow-px="" class="sfrb-note">No overflow diagnostics recorded.</div>
            <div id="consultant-preview-state" data-testid="consultant-preview-state" data-preview-visible="false" class="sfrb-note">No ghost preview active.</div>
            <div id="consultant-rationale" data-testid="consultant-rationale" class="sfrb-note">Awaiting a consultant proposal.</div>
            <div id="consultant-error" data-testid="consultant-error" class="sfrb-note" role="status" hidden>No consultant errors recorded.</div>
            <div class="sfrb-button-row">
              <button id="consultant-request" data-testid="consultant-request" type="button" class="sfrb-button sfrb-button-primary" disabled>Request proposal</button>
              <button id="consultant-accept" data-testid="consultant-accept" type="button" class="sfrb-button" disabled>Accept preview</button>
              <button id="consultant-reject" data-testid="consultant-reject" type="button" class="sfrb-button" disabled>Reject preview</button>
            </div>
          </section>

          <section id="template-picker" data-testid="template-picker" data-active-template-id="default" class="sfrb-panel sfrb-rail-panel">
            <h3>Template</h3>
            <div id="template-active-label" data-testid="template-active-label" class="sfrb-strong-line">default</div>
            <div id="template-picker-note" data-testid="template-picker-note" class="sfrb-note">Selecting a template persists metadata.template through the canonical write path.</div>
            <div id="template-picker-buttons" data-testid="template-picker-buttons" class="sfrb-button-row"></div>
          </section>

          <section id="export-panel" data-testid="export-panel" data-export-state="loading" class="sfrb-panel sfrb-rail-panel">
            <h3>Export</h3>
            <div id="export-state-label" data-testid="export-state-label" class="sfrb-strong-line">Checking…</div>
            <div id="export-state-note" data-testid="export-state-note" class="sfrb-note">Probing the shared export surface for readiness.</div>
            <div class="sfrb-button-row">
              <button id="export-preview" data-testid="export-preview" type="button" class="sfrb-button sfrb-button-primary" disabled>Preview export</button>
            </div>
          </section>
        </aside>
      </main>

      <div id="reconciliation-dialog" data-testid="reconciliation-dialog" role="dialog" aria-modal="true" aria-labelledby="reconciliation-dialog-title" hidden class="sfrb-dialog-overlay">
        <div class="sfrb-dialog-card">
          <h2 id="reconciliation-dialog-title">Leaving the freeform lens</h2>
          <p id="reconciliation-dialog-note" class="sfrb-note">Your freeform placements are saved. Decide how they should behave outside the freeform lens.</p>
          <div class="sfrb-button-row">
            <button id="reconcile-rejoin" data-testid="reconcile-rejoin" type="button" class="sfrb-button sfrb-button-primary">Rejoin layout</button>
            <button id="reconcile-keep" data-testid="reconcile-keep" type="button" class="sfrb-button">Keep freeform placement</button>
            <button id="reconcile-cancel" data-testid="reconcile-cancel" type="button" class="sfrb-button">Cancel</button>
          </div>
        </div>
      </div>

      <details id="workspace-inspector" data-testid="workspace-inspector" class="sfrb-inspector">
        <summary>Workspace inspector</summary>
        <div class="sfrb-inspector-body">
          <div class="sfrb-inspector-grid">
            <section id="bridge-status" data-testid="bridge-status" data-status="loading" class="sfrb-fact">
              <div class="sfrb-kicker">Bridge status</div>
              <div id="bridge-status-label" class="sfrb-strong-line">Loading</div>
              <div id="bridge-last-signal" data-testid="bridge-last-signal" class="sfrb-note">Waiting for bridge events</div>
            </section>
            <section id="workspace-ai-panel" data-testid="workspace-ai-panel" data-ai-status="loading" class="sfrb-fact">
              <div class="sfrb-kicker">AI availability</div>
              <div id="workspace-ai-status" data-testid="workspace-ai-status" class="sfrb-strong-line">Loading</div>
              <div id="workspace-ai-note" data-testid="workspace-ai-note" class="sfrb-note">Checking AI state…</div>
            </section>
            <section class="sfrb-fact">
              <div class="sfrb-kicker">Workspace root</div>
              <div id="workspace-root" data-testid="workspace-root">Loading workspace root…</div>
            </section>
            <section class="sfrb-fact">
              <div class="sfrb-kicker">Editing physics</div>
              <div id="physics-mode" data-testid="physics-mode">Unavailable</div>
            </section>
            <section class="sfrb-fact">
              <div class="sfrb-kicker">Document path</div>
              <div id="document-path" data-testid="document-path">Loading document path…</div>
            </section>
            <section class="sfrb-fact">
              <div class="sfrb-kicker">Config path</div>
              <div id="config-path" data-testid="config-path">Loading config path…</div>
            </section>
          </div>
          <div>
            <div class="sfrb-kicker">Canonical payload preview</div>
            <pre id="bridge-payload-preview" data-testid="bridge-payload-preview">Loading bridge payload…</pre>
          </div>
          <div id="bridge-error-panel" data-testid="bridge-error-panel" hidden>
            <div class="sfrb-kicker">Invalid workspace state</div>
            <h2 id="bridge-error-name">Waiting for payload</h2>
            <p id="bridge-error-message" data-testid="bridge-error-message" class="sfrb-note">Fetching bridge payload…</p>
            <ul id="bridge-error-issues" data-testid="bridge-error-issues"></ul>
          </div>
        </div>
      </details>
    </div>
  `;
}
