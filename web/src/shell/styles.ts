import { rootTokensCss } from '../ui/tokens';

const SHELL_STYLE_ID = 'sfrb-shell-styles';

const SHELL_CSS = `
  ${rootTokensCss()}

  :root {
    color-scheme: light;
  }

  body {
    margin: 0;
    background: var(--sfrb-paper);
    color: var(--sfrb-ink);
    font-family: var(--sfrb-font-sans);
    font-size: var(--sfrb-type-sm);
    line-height: 1.5;
  }

  .sfrb-shell {
    max-width: 1360px;
    margin: 0 auto;
    padding: 16px 24px 64px;
  }

  .sfrb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding: 4px 2px 14px;
  }

  .sfrb-header h1 {
    margin: 0;
    font-size: var(--sfrb-type-md);
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--sfrb-ink-soft);
  }

  .sfrb-header .sfrb-wordmark {
    color: var(--sfrb-accent);
    font-weight: 700;
    letter-spacing: 0;
  }

  .sfrb-chip-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sfrb-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 11px;
    border-radius: var(--sfrb-radius-pill);
    font-size: var(--sfrb-type-xs);
    font-weight: 500;
    border: 1px solid var(--sfrb-line);
    background: var(--sfrb-panel);
    color: var(--sfrb-ink-soft);
  }

  .sfrb-panel {
    background: var(--sfrb-panel);
    border: 1px solid var(--sfrb-line);
    border-radius: var(--sfrb-radius-lg);
    box-shadow: var(--sfrb-shadow-e1);
  }

  .sfrb-guidance {
    display: flex;
    align-items: center;
    gap: 8px 18px;
    flex-wrap: wrap;
    padding: 12px 18px;
    margin-bottom: 14px;
  }

  .sfrb-guidance h2 {
    margin: 0;
    font-size: var(--sfrb-type-md);
    font-weight: 600;
  }

  .sfrb-guidance p {
    margin: 0;
    color: var(--sfrb-ink-soft);
    flex: 1 1 320px;
  }

  .sfrb-guidance .sfrb-guidance-lead {
    display: grid;
    gap: 2px;
    flex: 1 1 360px;
  }

  /* Session-only visual collapse — the section and starter facts stay in the
     DOM for the selector contract and reappear on every fresh load. */
  .sfrb-guidance[data-dismissed='true'] {
    display: none;
  }

  .sfrb-kicker {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--sfrb-ink-faint);
  }

  .sfrb-starter-card {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 12px;
    border-radius: var(--sfrb-radius-md);
    border: 1px solid var(--sfrb-line-soft);
    background: var(--sfrb-paper);
    font-size: var(--sfrb-type-xs);
  }

  .sfrb-starter-card strong {
    font-size: var(--sfrb-type-xs);
    font-weight: 600;
    white-space: nowrap;
  }

  .sfrb-starter-card [data-testid="starter-id"] {
    color: var(--sfrb-ink-faint);
    font-family: var(--sfrb-font-mono);
    font-size: 11px;
    word-break: break-word;
  }

  .sfrb-toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .sfrb-lens-switcher {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border-radius: var(--sfrb-radius-pill);
    border: 1px solid var(--sfrb-line);
    background: var(--sfrb-panel);
    width: fit-content;
    box-shadow: var(--sfrb-shadow-e1);
  }

  .sfrb-lens-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 14px;
    border-radius: var(--sfrb-radius-pill);
    border: 1px solid transparent;
    background: transparent;
    color: var(--sfrb-ink-soft);
    font: inherit;
    font-size: var(--sfrb-type-sm);
    font-weight: 500;
    cursor: pointer;
  }

  .sfrb-lens-pill:hover:not(:disabled) {
    background: var(--sfrb-accent-soft);
    color: var(--sfrb-ink);
  }

  .sfrb-lens-pill:focus-visible {
    outline: 2px solid var(--sfrb-accent);
    outline-offset: 2px;
  }

  .sfrb-lens-pill[aria-checked='true'] {
    background: var(--sfrb-accent);
    border-color: var(--sfrb-accent);
    color: #ffffff;
    font-weight: 600;
  }

  .sfrb-lens-pill:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .sfrb-lens-pill .sfrb-lens-availability {
    font-size: 11px;
    font-weight: 500;
    color: var(--sfrb-ink-faint);
  }

  .sfrb-lens-pill:disabled .sfrb-lens-availability {
    color: inherit;
  }

  .sfrb-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    clip-path: inset(50%);
    overflow: hidden;
    white-space: nowrap;
  }

  .sfrb-columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
    gap: 16px;
    align-items: start;
  }

  @media (max-width: 980px) {
    .sfrb-columns {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .sfrb-canvas-panel {
    padding: 0;
    overflow: hidden;
  }

  .sfrb-rail {
    display: grid;
    gap: 12px;
  }

  .sfrb-rail-panel {
    padding: 14px 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 10px;
  }

  .sfrb-rail-panel > * {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .sfrb-rail-panel > h3 {
    grid-column: 1;
    grid-row: 1;
    align-self: center;
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sfrb-ink-faint);
    font-weight: 600;
  }

  .sfrb-rail-panel > .sfrb-strong-line {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
  }

  .sfrb-rail-panel .sfrb-strong-line {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: var(--sfrb-radius-pill);
    font-size: var(--sfrb-type-xs);
    font-weight: 600;
    background: var(--sfrb-line-soft);
    color: var(--sfrb-ink-soft);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sfrb-note {
    color: var(--sfrb-ink-soft);
    line-height: 1.5;
    font-size: var(--sfrb-type-sm);
  }

  .sfrb-fact-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .sfrb-fact {
    padding: 8px 10px;
    border-radius: var(--sfrb-radius-md);
    background: var(--sfrb-paper);
    border: 1px solid var(--sfrb-line-soft);
    font-size: var(--sfrb-type-xs);
    color: var(--sfrb-ink-soft);
  }

  .sfrb-fact .sfrb-kicker {
    font-size: 10px;
  }

  .sfrb-button {
    padding: 7px 14px;
    border-radius: var(--sfrb-radius-pill);
    border: 1px solid var(--sfrb-line);
    background: var(--sfrb-panel);
    color: var(--sfrb-ink);
    font: inherit;
    font-size: var(--sfrb-type-sm);
    font-weight: 500;
    cursor: pointer;
  }

  .sfrb-button:hover:not(:disabled) {
    border-color: var(--sfrb-accent);
    color: var(--sfrb-accent);
  }

  .sfrb-button:focus-visible {
    outline: 2px solid var(--sfrb-accent);
    outline-offset: 2px;
  }

  .sfrb-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sfrb-button.sfrb-button-primary {
    background: var(--sfrb-accent);
    border-color: var(--sfrb-accent);
    color: #ffffff;
  }

  .sfrb-button.sfrb-button-primary:hover:not(:disabled) {
    color: #ffffff;
    filter: brightness(1.06);
  }

  .sfrb-button-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sfrb-button[data-active='true'] {
    border-color: var(--sfrb-accent);
    background: var(--sfrb-accent-soft);
    color: var(--sfrb-accent);
    box-shadow: none;
  }

  #editor-save-status .sfrb-strong-line {
    background: var(--sfrb-good-soft);
    color: var(--sfrb-good);
  }

  #editor-save-status[data-save-state='saving'] .sfrb-strong-line {
    background: var(--sfrb-accent-soft);
    color: var(--sfrb-accent);
  }

  #editor-save-status[data-save-state='error'] {
    box-shadow: inset 2px 0 0 var(--sfrb-bad), var(--sfrb-shadow-e1);
  }

  #editor-save-status[data-save-state='error'] .sfrb-strong-line {
    background: var(--sfrb-bad-soft);
    color: var(--sfrb-bad);
  }

  #consultant-panel[data-consultant-state='loading'] .sfrb-strong-line {
    background: var(--sfrb-accent-soft);
    color: var(--sfrb-accent);
  }

  #consultant-panel[data-consultant-state='preview'] .sfrb-strong-line {
    background: var(--sfrb-good-soft);
    color: var(--sfrb-good);
  }

  #consultant-panel[data-consultant-state='unavailable'] .sfrb-strong-line {
    background: var(--sfrb-defer-soft);
    color: var(--sfrb-defer);
  }

  #consultant-panel[data-consultant-state='error'] {
    box-shadow: inset 2px 0 0 var(--sfrb-bad), var(--sfrb-shadow-e1);
  }

  #consultant-panel[data-consultant-state='error'] .sfrb-strong-line {
    background: var(--sfrb-bad-soft);
    color: var(--sfrb-bad);
  }

  #export-panel[data-export-state='ready'] .sfrb-strong-line {
    background: var(--sfrb-good-soft);
    color: var(--sfrb-good);
  }

  #export-panel[data-export-state='risk'] .sfrb-strong-line {
    background: var(--sfrb-warn-soft);
    color: var(--sfrb-warn);
  }

  #export-panel[data-export-state='risk'] {
    box-shadow: inset 2px 0 0 var(--sfrb-warn), var(--sfrb-shadow-e1);
  }

  #export-panel[data-export-state='blocked'] .sfrb-strong-line {
    background: var(--sfrb-bad-soft);
    color: var(--sfrb-bad);
  }

  #export-panel[data-export-state='blocked'] {
    box-shadow: inset 2px 0 0 var(--sfrb-bad), var(--sfrb-shadow-e1);
  }

  #bridge-status[data-status='error'],
  #bridge-status[data-status='fetch-error'] {
    border-color: var(--sfrb-bad);
    background: var(--sfrb-bad-soft);
  }

  .sfrb-inspector {
    margin-top: 16px;
    border: 1px solid var(--sfrb-line);
    border-radius: var(--sfrb-radius-lg);
    background: var(--sfrb-panel);
  }

  .sfrb-inspector > summary {
    cursor: pointer;
    padding: 12px 16px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--sfrb-ink-faint);
    user-select: none;
  }

  .sfrb-inspector > summary:focus-visible {
    outline: 2px solid var(--sfrb-accent);
    outline-offset: -2px;
  }

  .sfrb-inspector-body {
    padding: 4px 16px 16px;
    display: grid;
    gap: 14px;
  }

  .sfrb-inspector-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
  }

  .sfrb-inspector-grid [data-testid="workspace-root"],
  .sfrb-inspector-grid [data-testid="document-path"],
  .sfrb-inspector-grid [data-testid="config-path"] {
    font-family: var(--sfrb-font-mono);
    font-size: 11px;
    word-break: break-all;
  }

  #bridge-payload-preview {
    margin: 0;
    padding: 14px;
    border-radius: var(--sfrb-radius-md);
    background: #16202b;
    color: #c8d6e5;
    overflow: auto;
    font-family: var(--sfrb-font-mono);
    font-size: var(--sfrb-type-xs);
    line-height: 1.5;
    max-height: 420px;
  }

  #bridge-error-panel {
    padding: 14px 16px;
    border-radius: var(--sfrb-radius-md);
    background: var(--sfrb-bad-soft);
    border: 1px solid var(--sfrb-bad);
  }

  #bridge-error-panel h2 {
    margin: 8px 0;
    font-size: var(--sfrb-type-md);
  }

  #bridge-error-issues {
    margin: 10px 0 0;
    padding-left: 18px;
    display: grid;
    gap: 6px;
    color: var(--sfrb-bad);
  }

  .sfrb-visually-deemphasized {
    color: var(--sfrb-ink-faint);
  }

  .sfrb-transition-strip {
    margin-bottom: 12px;
    padding: 8px 14px;
    border-radius: var(--sfrb-radius-md);
    border: 1px solid var(--sfrb-accent-soft);
    background: var(--sfrb-accent-soft);
    color: var(--sfrb-accent);
    font-size: var(--sfrb-type-sm);
    font-weight: 500;
  }

  .sfrb-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    background: rgba(29, 39, 51, 0.4);
  }

  .sfrb-dialog-overlay[hidden] {
    display: none;
  }

  .sfrb-dialog-card {
    background: var(--sfrb-panel);
    border-radius: var(--sfrb-radius-lg);
    border: 1px solid var(--sfrb-line);
    box-shadow: var(--sfrb-shadow-e3);
    padding: 20px 22px;
    max-width: 440px;
    display: grid;
    gap: 12px;
  }

  .sfrb-dialog-card h2 {
    margin: 0;
    font-size: var(--sfrb-type-md);
    font-weight: 600;
  }

  /* ===== canvas chrome (consumed by editor/canvas) ===== */

  .sfrb-canvas-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px 16px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-bottom: 1px solid var(--sfrb-line-soft);
  }

  .sfrb-canvas-bar h2 {
    margin: 0;
    font-size: var(--sfrb-type-md);
    font-weight: 600;
    line-height: 1.2;
  }

  .sfrb-canvas-meta {
    color: var(--sfrb-ink-faint);
    font-size: var(--sfrb-type-xs);
  }

  .sfrb-canvas-statusbar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 8px 16px;
    border-bottom: 1px solid var(--sfrb-line-soft);
    background: var(--sfrb-paper);
  }

  .sfrb-status-cell {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 2px 9px;
    border-radius: var(--sfrb-radius-pill);
    border: 1px solid var(--sfrb-line-soft);
    background: var(--sfrb-panel);
    font-size: 11px;
  }

  .sfrb-status-cell > .sfrb-status-cell-label {
    font-size: 10px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--sfrb-ink-faint);
    white-space: nowrap;
  }

  .sfrb-status-cell > :last-child {
    color: var(--sfrb-ink);
    font-family: var(--sfrb-font-mono);
    font-size: 11px;
    white-space: nowrap;
  }

  .sfrb-status-cell[data-empty='true'] {
    opacity: 0.45;
  }

  .sfrb-canvas-controls {
    display: grid;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--sfrb-line-soft);
  }

  .sfrb-canvas-controls:empty {
    display: none;
  }

  .sfrb-canvas-viewport {
    background: var(--sfrb-desk);
    padding: 36px 24px 48px;
    overflow: auto;
    display: grid;
    justify-items: center;
    min-height: 420px;
  }

  .sfrb-zoom-control {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border-radius: var(--sfrb-radius-pill);
    border: 1px solid var(--sfrb-line);
    background: var(--sfrb-paper);
    margin-left: auto;
  }

  .sfrb-zoom-btn {
    padding: 2px 10px;
    border-radius: var(--sfrb-radius-pill);
    border: none;
    background: transparent;
    color: var(--sfrb-ink-soft);
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
  }

  .sfrb-zoom-btn:hover {
    color: var(--sfrb-ink);
  }

  .sfrb-zoom-btn:focus-visible {
    outline: 2px solid var(--sfrb-accent);
    outline-offset: 1px;
  }

  .sfrb-zoom-btn[data-active='true'] {
    background: var(--sfrb-panel);
    color: var(--sfrb-ink);
    font-weight: 600;
    box-shadow: var(--sfrb-shadow-e1);
  }

  /* Tile drag handles stay quiet until the frame is hovered or selected. */
  #editor-canvas [data-testid^="frame-handle-"] {
    opacity: 0.4;
  }

  #editor-canvas [data-frame-id]:hover [data-testid^="frame-handle-"],
  #editor-canvas [data-frame-id][aria-current='true'] [data-testid^="frame-handle-"],
  #editor-canvas [data-testid^="frame-handle-"]:focus-visible {
    opacity: 1;
  }

  /* ===== motion (gated) ===== */

  @media (prefers-reduced-motion: no-preference) {
    .sfrb-button,
    .sfrb-lens-pill,
    .sfrb-zoom-btn,
    .sfrb-chip,
    .sfrb-status-cell,
    .sfrb-rail-panel .sfrb-strong-line {
      transition:
        background var(--sfrb-dur-fast) var(--sfrb-ease),
        border-color var(--sfrb-dur-fast) var(--sfrb-ease),
        color var(--sfrb-dur-fast) var(--sfrb-ease),
        box-shadow var(--sfrb-dur-fast) var(--sfrb-ease),
        opacity var(--sfrb-dur-fast) var(--sfrb-ease);
    }

    /* Selection/hover feedback on canvas blocks and frames. Geometry
       properties (left/top/width/height) must never transition: drags
       write them directly and tests assert exact coordinates. */
    #editor-canvas [data-frame-id],
    #editor-canvas [data-block-id],
    #editor-canvas [data-testid^="frame-handle-"] {
      transition:
        box-shadow var(--sfrb-dur-fast) var(--sfrb-ease),
        border-color var(--sfrb-dur-fast) var(--sfrb-ease),
        background-color var(--sfrb-dur-fast) var(--sfrb-ease),
        opacity var(--sfrb-dur-fast) var(--sfrb-ease);
    }

    @keyframes sfrb-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }

    #editor-save-status[data-save-state='saving'] .sfrb-strong-line {
      animation: sfrb-pulse 1.1s var(--sfrb-ease) infinite;
    }

    @keyframes sfrb-slide-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .sfrb-transition-strip:not([hidden]) {
      animation: sfrb-slide-in var(--sfrb-dur-base) var(--sfrb-ease);
    }

    @keyframes sfrb-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .sfrb-dialog-overlay:not([hidden]) {
      animation: sfrb-fade-in 140ms var(--sfrb-ease);
    }

    @keyframes sfrb-card-in {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    .sfrb-dialog-overlay:not([hidden]) .sfrb-dialog-card {
      animation: sfrb-card-in var(--sfrb-dur-base) var(--sfrb-ease);
    }
  }
`;

export function injectShellStyles(): void {
  if (document.getElementById(SHELL_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = SHELL_STYLE_ID;
  style.textContent = SHELL_CSS;
  document.head.append(style);
}
