const SHELL_STYLE_ID = 'sfrb-shell-styles';

const SHELL_CSS = `
  :root {
    color-scheme: light;
  }

  body {
    margin: 0;
    background: #f4f5f7;
    color: #0f172a;
    font-family: 'Avenir Next', 'Segoe UI', system-ui, -apple-system, sans-serif;
  }

  .sfrb-shell {
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px 24px 72px;
  }

  .sfrb-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding: 6px 2px 18px;
  }

  .sfrb-header h1 {
    margin: 0;
    font-size: 1.35rem;
    letter-spacing: -0.01em;
  }

  .sfrb-header .sfrb-wordmark {
    color: #2563eb;
  }

  .sfrb-chip-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sfrb-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    border: 1px solid #dbe2ea;
    background: #ffffff;
    color: #334155;
  }

  .sfrb-panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  }

  .sfrb-guidance {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
    gap: 18px;
    padding: 20px 22px;
    margin-bottom: 18px;
    align-items: start;
  }

  .sfrb-guidance h2 {
    margin: 4px 0 8px;
    font-size: 1.18rem;
  }

  .sfrb-guidance p {
    margin: 0;
    color: #475569;
    line-height: 1.6;
  }

  .sfrb-kicker {
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #64748b;
  }

  .sfrb-starter-card {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .sfrb-starter-card strong {
    display: block;
    font-size: 1.05rem;
    margin-top: 6px;
  }

  .sfrb-starter-card [data-testid="starter-id"] {
    margin-top: 6px;
    color: #64748b;
    font-size: 0.85rem;
    word-break: break-word;
  }

  .sfrb-lens-switcher {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }

  .sfrb-lens-option {
    display: grid;
    gap: 4px;
    padding: 12px 16px;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: border-color 120ms ease, box-shadow 120ms ease;
  }

  .sfrb-lens-option:hover:not(:disabled) {
    border-color: #93c5fd;
  }

  .sfrb-lens-option:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  .sfrb-lens-option[aria-checked='true'] {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  .sfrb-lens-option:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }

  .sfrb-lens-option .sfrb-lens-name {
    font-weight: 600;
  }

  .sfrb-lens-option .sfrb-lens-availability {
    color: #64748b;
    font-size: 0.82rem;
  }

  .sfrb-columns {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.45fr);
    gap: 18px;
    align-items: start;
  }

  .sfrb-canvas-panel {
    padding: 22px;
  }

  .sfrb-rail {
    display: grid;
    gap: 14px;
  }

  .sfrb-rail-panel {
    padding: 16px 18px;
    display: grid;
    gap: 10px;
  }

  .sfrb-rail-panel h3 {
    margin: 0;
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 600;
  }

  .sfrb-rail-panel .sfrb-strong-line {
    font-size: 1.05rem;
    font-weight: 600;
  }

  .sfrb-note {
    color: #475569;
    line-height: 1.55;
    font-size: 0.9rem;
  }

  .sfrb-fact-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .sfrb-fact {
    padding: 10px;
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid #eef2f7;
    font-size: 0.86rem;
    color: #334155;
  }

  .sfrb-fact .sfrb-kicker {
    font-size: 0.66rem;
  }

  .sfrb-button {
    padding: 9px 14px;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 120ms ease, background 120ms ease;
  }

  .sfrb-button:hover:not(:disabled) {
    border-color: #2563eb;
  }

  .sfrb-button:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  .sfrb-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sfrb-button.sfrb-button-primary {
    background: #2563eb;
    border-color: #2563eb;
    color: #ffffff;
  }

  .sfrb-button-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sfrb-button[data-active='true'] {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  #editor-save-status[data-save-state='error'] {
    border-color: #fca5a5;
    background: #fef2f2;
  }

  #editor-save-status[data-save-state='saving'] {
    border-color: #93c5fd;
    background: #eff6ff;
  }

  #consultant-panel[data-consultant-state='error'],
  #consultant-panel[data-consultant-state='unavailable'] {
    border-color: #fca5a5;
  }

  #consultant-panel[data-consultant-state='preview'] {
    border-color: #6ee7b7;
  }

  #export-panel[data-export-state='ready'] {
    border-color: #6ee7b7;
  }

  #export-panel[data-export-state='risk'],
  #export-panel[data-export-state='blocked'] {
    border-color: #fca5a5;
  }

  #bridge-status[data-status='error'],
  #bridge-status[data-status='fetch-error'] {
    border-color: #fca5a5;
    background: #fef2f2;
  }

  .sfrb-inspector {
    margin-top: 18px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #ffffff;
  }

  .sfrb-inspector > summary {
    cursor: pointer;
    padding: 14px 18px;
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #64748b;
    user-select: none;
  }

  .sfrb-inspector > summary:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: -2px;
  }

  .sfrb-inspector-body {
    padding: 4px 18px 18px;
    display: grid;
    gap: 14px;
  }

  .sfrb-inspector-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }

  #bridge-payload-preview {
    margin: 0;
    padding: 14px;
    border-radius: 12px;
    background: #0f172a;
    color: #c7d2fe;
    overflow: auto;
    font-size: 0.8rem;
    line-height: 1.5;
    max-height: 420px;
  }

  #bridge-error-panel {
    padding: 14px 16px;
    border-radius: 12px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
  }

  #bridge-error-panel h2 {
    margin: 8px 0;
    font-size: 1.1rem;
  }

  #bridge-error-issues {
    margin: 10px 0 0;
    padding-left: 18px;
    display: grid;
    gap: 6px;
    color: #b91c1c;
  }

  .sfrb-visually-deemphasized {
    color: #94a3b8;
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
