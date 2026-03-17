import {
  type BridgeConsultantResult,
  type BridgeEditorStatusSnapshot,
  type BridgePayload,
  type BridgeSignal,
  type ReadyBridgePayload,
  BRIDGE_BOOTSTRAP_PATH,
  createBridgeEditorStatusStore,
  fetchBridgePayload,
  requestBridgeLayoutConsultant,
  submitBridgeDocumentMutation,
  subscribeToBridgeSignals,
} from './bridge-client';
import { mountCanvas, type CanvasConsultantPreview, type CanvasOverflowDiagnostics } from './editor/Canvas';
import { composeFrameResizeCandidate, createDocumentEditorEngine } from './editor/engine';

const pageStyles = [
  'min-height: 100vh',
  'margin: 0',
  'background: radial-gradient(circle at top left, rgba(251, 191, 36, 0.16), transparent 28%), radial-gradient(circle at top right, rgba(96, 165, 250, 0.16), transparent 32%), linear-gradient(180deg, #13100f 0%, #0a0b0f 100%)',
  'color: #f5efe7',
  'font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif',
].join('; ');

const shellStyles = ['max-width: 1240px', 'margin: 0 auto', 'padding: 36px 24px 88px'].join('; ');
const panelStyles = [
  'background: rgba(20, 18, 21, 0.82)',
  'border: 1px solid rgba(245, 222, 179, 0.14)',
  'border-radius: 28px',
  'box-shadow: 0 28px 100px rgba(0, 0, 0, 0.36)',
  'backdrop-filter: blur(22px)',
].join('; ');
const pillStyles = [
  'display: inline-flex',
  'align-items: center',
  'gap: 8px',
  'padding: 8px 14px',
  'border-radius: 999px',
  'font-size: 0.82rem',
  'letter-spacing: 0.08em',
  'text-transform: uppercase',
  'border: 1px solid rgba(245, 222, 179, 0.22)',
  'background: rgba(245, 222, 179, 0.08)',
  'color: #fce7c7',
].join('; ');
const previewStyles = [
  'margin-top: 16px',
  'padding: 18px',
  'border-radius: 18px',
  'background: rgba(7, 9, 14, 0.9)',
  'overflow: auto',
  'font-size: 0.82rem',
  'line-height: 1.5',
  'color: #c7d2fe',
  'max-height: 560px',
].join('; ');

function formatSignalLabel(signal: BridgeSignal | null): string {
  if (!signal) {
    return 'Waiting for bridge events';
  }

  const changedPaths = Array.isArray(signal.detail.changedPaths)
    ? signal.detail.changedPaths.filter((value): value is string => typeof value === 'string')
    : [];
  const changedPath = typeof signal.detail.changedPath === 'string' ? signal.detail.changedPath : null;
  const watchedPath = typeof signal.detail.watchedPath === 'string' ? signal.detail.watchedPath : null;
  const suffix = changedPaths.length > 0 ? changedPaths.join(', ') : (changedPath ?? watchedPath);
  return suffix ? `${signal.event} · ${suffix}` : signal.event;
}

type ConsultantUiState = 'idle' | 'detecting' | 'requesting' | 'preview' | 'applying' | 'error' | 'unavailable';

function createShellMarkup(): string {
  return `
    <main style="${pageStyles}">
      <div style="${shellStyles}">
        <section id="first-run-guidance" data-testid="first-run-guidance" style="${panelStyles}; padding: 34px; margin-bottom: 24px; overflow: hidden; position: relative;">
          <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), transparent 38%, rgba(96, 165, 250, 0.08)); pointer-events: none;"></div>
          <div style="position: relative; display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr); gap: 24px; align-items: start;">
            <div>
              <div style="${pillStyles}">SfRB first-run shell</div>
              <h1 style="margin: 18px 0 10px; font-size: clamp(2.5rem, 5vw, 4.8rem); line-height: 0.92; letter-spacing: -0.03em; color: #fff7ed;">Replace the starter, keep the loop.</h1>
              <p style="margin: 0; max-width: 60ch; color: #e7ddd0; font-size: 1.06rem; line-height: 1.7;">
                This screen is driven by canonical workspace state from <code>${BRIDGE_BOOTSTRAP_PATH}</code>. Start by replacing the shipped starter copy, then keep editing the same saved resume through text edits today and layout moves where frames already exist.
              </p>
              <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px;">
                <div id="starter-chip" data-testid="starter-chip" data-starter-kind="loading" style="${pillStyles}; background: rgba(250, 204, 21, 0.12); border-color: rgba(250, 204, 21, 0.28); color: #fde68a;">Starter · loading</div>
                <div id="workspace-ai-chip" data-testid="workspace-ai-chip" data-ai-status="loading" style="${pillStyles}; background: rgba(96, 165, 250, 0.12); border-color: rgba(96, 165, 250, 0.28); color: #bfdbfe;">AI · loading</div>
              </div>
            </div>
            <aside style="display: grid; gap: 14px; min-width: 0;">
              <div style="padding: 18px 20px; border-radius: 22px; background: rgba(250, 204, 21, 0.08); border: 1px solid rgba(250, 204, 21, 0.16);">
                <div style="font-size: 0.76rem; letter-spacing: 0.18em; text-transform: uppercase; color: #fcd34d;">Starter on disk</div>
                <div id="starter-kind" data-testid="starter-kind" style="margin-top: 10px; font-size: 1.5rem; font-weight: 700; color: #fff7ed;">Loading…</div>
                <div id="starter-id" data-testid="starter-id" style="margin-top: 8px; color: #f6e7c8; word-break: break-word;">Waiting for starter metadata…</div>
              </div>
              <div style="padding: 18px 20px; border-radius: 22px; background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.16);">
                <div style="font-size: 0.76rem; letter-spacing: 0.18em; text-transform: uppercase; color: #93c5fd;">What to do first</div>
                <div id="starter-guidance" data-testid="starter-guidance" style="margin-top: 10px; line-height: 1.65; color: #dbeafe;">Loading starter guidance…</div>
              </div>
            </aside>
          </div>
        </section>

        <section id="editing-lenses" data-testid="editing-lenses" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-bottom: 24px;">
          <article data-testid="lens-text" style="${panelStyles}; padding: 24px; background: rgba(24, 20, 16, 0.9);">
            <div style="font-size: 0.76rem; letter-spacing: 0.18em; text-transform: uppercase; color: #fca5a5;">Text lens</div>
            <h2 style="margin: 12px 0 10px; font-size: 1.5rem; color: #fff7ed;">Rewrite the actual words.</h2>
            <p style="margin: 0; color: #e7ddd0; line-height: 1.65;">Use this when you are replacing starter copy, tightening phrasing, or correcting facts. It ships now and persists through the canonical editor route in every workspace.</p>
            <div data-testid="lens-text-availability" style="margin-top: 14px; color: #fda4af; font-size: 0.92rem;">Available now</div>
          </article>
          <article data-testid="lens-tile" style="${panelStyles}; padding: 24px; background: rgba(17, 23, 31, 0.9);">
            <div style="font-size: 0.76rem; letter-spacing: 0.18em; text-transform: uppercase; color: #93c5fd;">Tile lens</div>
            <h2 style="margin: 12px 0 10px; font-size: 1.5rem; color: #eff6ff;">Move placed blocks when layout matters.</h2>
            <p style="margin: 0; color: #d7e7f7; line-height: 1.65;">Use this when the current workspace already includes placed frames and you need to nudge or resize them. It is a layout aid over the same saved resume, not a separate document mode.</p>
            <div id="tile-lens-availability" data-testid="lens-tile-availability" style="margin-top: 14px; color: #93c5fd; font-size: 0.92rem;">Checking current workspace…</div>
          </article>
          <article data-testid="lens-freeform" style="${panelStyles}; padding: 24px; background: rgba(22, 18, 31, 0.9);">
            <div style="font-size: 0.76rem; letter-spacing: 0.18em; text-transform: uppercase; color: #c4b5fd;">Freeform lens</div>
            <h2 style="margin: 12px 0 10px; font-size: 1.5rem; color: #f5f3ff;">Treat the resume as one shared source.</h2>
            <p style="margin: 0; color: #e9ddff; line-height: 1.65;">This lens is not shipped as a separate surface yet. For now, keep using text edits and tile adjustments where available; both still write back to the same canonical document.</p>
            <div data-testid="lens-freeform-availability" style="margin-top: 14px; color: #c4b5fd; font-size: 0.92rem;">Not shipped yet</div>
          </article>
        </section>

        <section style="display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.6fr); gap: 24px; align-items: start; margin-bottom: 24px;">
          <article style="${panelStyles}; padding: 28px;">
            <div id="editor-host"></div>
          </article>
          <aside style="display: grid; gap: 18px;">
            <section id="bridge-status" data-testid="bridge-status" data-status="loading" style="${panelStyles}; padding: 20px; background: rgba(12, 63, 50, 0.28); border-color: rgba(45, 212, 191, 0.24);">
              <div style="font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; color: #d1fae5;">Bridge status</div>
              <div id="bridge-status-label" style="margin-top: 10px; font-size: 1.35rem; font-weight: 700; color: #ecfdf5;">Loading</div>
              <div id="bridge-last-signal" data-testid="bridge-last-signal" style="margin-top: 8px; color: #d1fae5; line-height: 1.5;">Waiting for bridge events</div>
            </section>

            <section id="workspace-ai-panel" data-testid="workspace-ai-panel" data-ai-status="loading" style="${panelStyles}; padding: 20px;">
              <div style="font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; color: #bfdbfe;">AI availability</div>
              <div id="workspace-ai-status" data-testid="workspace-ai-status" style="margin-top: 10px; font-size: 1.2rem; font-weight: 700; color: #eff6ff;">Loading</div>
              <div id="workspace-ai-note" data-testid="workspace-ai-note" style="margin-top: 8px; color: #dbeafe; line-height: 1.6;">Checking AI state…</div>
            </section>

            <section id="consultant-panel" data-testid="consultant-panel" data-consultant-state="idle" data-consultant-code="none" style="${panelStyles}; padding: 22px; display: grid; gap: 12px;">
              <div>
                <div style="font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; color: #93c5fd;">AI layout consultant</div>
                <div id="consultant-status" data-testid="consultant-status" data-consultant-state="idle" style="margin-top: 10px; font-size: 1.2rem; font-weight: 700; color: #eff6ff;">idle</div>
                <div id="consultant-state-note" data-testid="consultant-state-note" style="margin-top: 8px; color: #cbd5e1; line-height: 1.5;">Select a design frame to inspect overflow.</div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
                <div style="padding: 12px; border-radius: 14px; background: rgba(2, 6, 23, 0.48);">
                  <div style="font-size: 0.72rem; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em;">Overflow</div>
                  <div id="consultant-overflow-status" data-testid="consultant-overflow-status" data-overflow-status="idle" style="margin-top: 8px;">idle</div>
                </div>
                <div style="padding: 12px; border-radius: 14px; background: rgba(2, 6, 23, 0.48);">
                  <div style="font-size: 0.72rem; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em;">Proposal frame</div>
                  <div id="consultant-frame-id" data-testid="consultant-frame-id" data-frame-id="" style="margin-top: 8px;">None</div>
                </div>
              </div>
              <div id="consultant-measurements" data-testid="consultant-measurements" data-overflow-px="" style="padding: 12px; border-radius: 14px; background: rgba(2, 6, 23, 0.48); color: #cbd5e1; line-height: 1.5;">
                No overflow diagnostics recorded.
              </div>
              <div id="consultant-preview-state" data-testid="consultant-preview-state" data-preview-visible="false" style="padding: 12px; border-radius: 14px; background: rgba(2, 6, 23, 0.48); color: #cbd5e1; line-height: 1.5;">
                No ghost preview active.
              </div>
              <div id="consultant-rationale" data-testid="consultant-rationale" style="padding: 12px; border-radius: 14px; background: rgba(2, 6, 23, 0.48); color: #dbeafe; line-height: 1.5;">Awaiting a consultant proposal.</div>
              <div id="consultant-error" data-testid="consultant-error" style="padding: 12px; border-radius: 14px; background: rgba(127, 29, 29, 0.24); color: #fecaca; line-height: 1.5;" hidden>No consultant errors recorded.</div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="consultant-request" data-testid="consultant-request" type="button" disabled style="padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(96, 165, 250, 0.4); background: rgba(59, 130, 246, 0.24); color: #eff6ff; font: inherit; cursor: pointer;">Request proposal</button>
                <button id="consultant-accept" data-testid="consultant-accept" type="button" disabled style="padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(45, 212, 191, 0.35); background: rgba(13, 148, 136, 0.22); color: #ecfeff; font: inherit; cursor: pointer;">Accept preview</button>
                <button id="consultant-reject" data-testid="consultant-reject" type="button" disabled style="padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(244, 114, 182, 0.35); background: rgba(190, 24, 93, 0.18); color: #ffe4e6; font: inherit; cursor: pointer;">Reject preview</button>
              </div>
            </section>

            <section id="editor-save-status" data-testid="editor-save-status" data-save-state="idle" style="${panelStyles}; padding: 20px; background: rgba(51, 65, 85, 0.34); border-color: rgba(148, 163, 184, 0.28);">
              <div style="font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; color: #cbd5e1;">Editor save state</div>
              <div id="editor-save-state-label" style="margin-top: 10px; font-size: 1.1rem; font-weight: 700;">idle</div>
              <div id="editor-save-error" data-testid="editor-save-error" style="margin-top: 8px; color: #dbeafe; line-height: 1.5;">No save errors recorded.</div>
            </section>
          </aside>
        </section>

        <section id="diagnostics-panel" data-testid="diagnostics-panel" style="${panelStyles}; padding: 24px;">
          <div style="display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: baseline;">
            <div>
              <div style="font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: #cbd5e1;">Diagnostics</div>
              <h2 style="margin: 10px 0 0; font-size: 1.6rem; color: #f8fafc;">Secondary surfaces for inspection and debugging.</h2>
            </div>
            <div style="color: #94a3b8; max-width: 44ch; line-height: 1.55;">Starter guidance stays primary above. These panels are here so a future agent can inspect paths, payloads, and bridge failures without leaving the browser.</div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 18px;">
            <article style="padding: 18px; border-radius: 18px; background: rgba(15, 23, 42, 0.48);">
              <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Workspace root</div>
              <div id="workspace-root" data-testid="workspace-root" style="margin-top: 10px; word-break: break-word; line-height: 1.5;">Loading workspace root…</div>
            </article>
            <article style="padding: 18px; border-radius: 18px; background: rgba(15, 23, 42, 0.48);">
              <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Editing physics</div>
              <div id="physics-mode" data-testid="physics-mode" style="margin-top: 10px; font-size: 1.4rem; color: #eff6ff;">Unavailable</div>
            </article>
            <article style="padding: 18px; border-radius: 18px; background: rgba(15, 23, 42, 0.48);">
              <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Document path</div>
              <div id="document-path" data-testid="document-path" style="margin-top: 10px; word-break: break-word; line-height: 1.5;">Loading document path…</div>
            </article>
            <article style="padding: 18px; border-radius: 18px; background: rgba(15, 23, 42, 0.48);">
              <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Config path</div>
              <div id="config-path" data-testid="config-path" style="margin-top: 10px; word-break: break-word; line-height: 1.5;">Loading config path…</div>
            </article>
          </div>
          <div style="margin-top: 18px;">
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Canonical payload preview</div>
            <pre id="bridge-payload-preview" data-testid="bridge-payload-preview" style="${previewStyles}">Loading bridge payload…</pre>
          </div>
          <div id="bridge-error-panel" data-testid="bridge-error-panel" hidden style="margin-top: 18px; padding: 18px; border-radius: 18px; background: rgba(127, 29, 29, 0.35); border: 1px solid rgba(248, 113, 113, 0.45);">
            <div style="color: #fca5a5; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Invalid workspace state</div>
            <h2 id="bridge-error-name" style="margin: 14px 0 10px; font-size: 1.5rem;">Waiting for payload</h2>
            <p id="bridge-error-message" data-testid="bridge-error-message" style="color: #fee2e2; line-height: 1.6; margin: 0;">Fetching bridge payload…</p>
            <ul id="bridge-error-issues" data-testid="bridge-error-issues" style="margin: 16px 0 0; padding-left: 18px; display: grid; gap: 8px; color: #fecaca;"></ul>
          </div>
        </section>
      </div>
    </main>
  `;
}

function setText(root: ParentNode, selector: string, value: string): void {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function setBridgeStatusVisuals(container: HTMLElement, status: string, isError: boolean): void {
  container.dataset.status = status;
  container.style.background = isError ? 'rgba(127, 29, 29, 0.46)' : 'rgba(12, 63, 50, 0.28)';
  container.style.border = isError ? '1px solid rgba(248, 113, 113, 0.4)' : '1px solid rgba(45, 212, 191, 0.24)';
}

function setSaveStatusVisuals(container: HTMLElement, editorStatus: BridgeEditorStatusSnapshot): void {
  container.dataset.saveState = editorStatus.saveState;
  if (editorStatus.saveState === 'error') {
    container.style.background = 'rgba(127, 29, 29, 0.46)';
    container.style.border = '1px solid rgba(248, 113, 113, 0.55)';
    return;
  }

  if (editorStatus.saveState === 'saving') {
    container.style.background = 'rgba(59, 130, 246, 0.22)';
    container.style.border = '1px solid rgba(96, 165, 250, 0.45)';
    return;
  }

  container.style.background = 'rgba(51, 65, 85, 0.34)';
  container.style.border = '1px solid rgba(148, 163, 184, 0.28)';
}

function setButtonState(button: HTMLElement | null, enabled: boolean): void {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  button.disabled = !enabled;
  button.style.opacity = enabled ? '1' : '0.48';
  button.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

function createDocumentKey(payload: ReadyBridgePayload | null): string | null {
  return payload ? JSON.stringify(payload.document) : null;
}

function mapConsultantFailureState(result: BridgeConsultantResult): ConsultantUiState {
  if (result.ok) {
    return 'preview';
  }
  return result.status === 'unavailable' ? 'unavailable' : 'error';
}

function getStarterLabel(payload: ReadyBridgePayload | null): string {
  if (!payload?.starter) {
    return 'Custom workspace';
  }

  return payload.starter.kind === 'template' ? 'Template starter' : 'Blank starter';
}

function getStarterGuidance(payload: ReadyBridgePayload | null): string {
  if (!payload?.starter) {
    return 'This workspace does not advertise a shipped starter. Start by editing the live document content below.';
  }

  if (payload.starter.kind === 'template') {
    return 'This workspace starts with realistic sample content. Replace the name, summary, and bullets with your own details before adjusting layout.';
  }

  return 'This workspace starts intentionally sparse. Replace the single starter line with your own opening summary, then grow the resume from there.';
}

export function mountApp(rootElement: HTMLElement) {
  rootElement.innerHTML = createShellMarkup();

  const editorStatusStore = createBridgeEditorStatusStore();
  const editorEngine = createDocumentEditorEngine({ statusStore: editorStatusStore });
  const editorHost = rootElement.querySelector('#editor-host');
  if (!(editorHost instanceof HTMLElement)) {
    throw new Error('Missing #editor-host for editor canvas mount.');
  }

  let payload: BridgePayload | null = null;
  let lastSignal: BridgeSignal | null = null;
  let fetchError: string | null = null;
  let overflowDiagnostics: CanvasOverflowDiagnostics = {
    status: 'idle',
    frameId: null,
    blockId: null,
    measuredContentHeight: null,
    measuredAvailableHeight: null,
    overflowPx: null,
    documentKey: null,
  };
  let consultantState: ConsultantUiState = 'idle';
  let consultantCode = 'none';
  let consultantNote = 'Select a design frame to inspect overflow.';
  let consultantErrorMessage: string | null = null;
  let preview: CanvasConsultantPreview | null = null;
  let activeConsultantRequest: AbortController | null = null;

  const canvas = mountCanvas(editorHost, editorEngine, {
    onOverflowChange: (diagnostics) => {
      overflowDiagnostics = diagnostics;
      if (preview && diagnostics.documentKey && preview.sourceDocumentKey !== diagnostics.documentKey) {
        preview = null;
        canvas.setGhostPreview(null);
        consultantState = 'idle';
        consultantCode = 'preview_stale_cleared';
        consultantNote = 'Ghost preview cleared because the canonical document changed.';
      } else if (!preview && consultantState !== 'requesting' && consultantState !== 'applying' && consultantState !== 'error' && consultantState !== 'unavailable') {
        consultantState = diagnostics.status === 'settling' ? 'detecting' : 'idle';
      }
      syncConsultantSurface();
    },
  });

  const bridgeStatus = rootElement.querySelector('#bridge-status');
  const saveStatus = rootElement.querySelector('#editor-save-status');
  const errorPanel = rootElement.querySelector('#bridge-error-panel');
  const errorIssues = rootElement.querySelector('#bridge-error-issues');
  const payloadPreview = rootElement.querySelector('#bridge-payload-preview');
  const consultantPanel = rootElement.querySelector('#consultant-panel');
  const consultantError = rootElement.querySelector('#consultant-error');
  const requestButton = rootElement.querySelector('#consultant-request');
  const acceptButton = rootElement.querySelector('#consultant-accept');
  const rejectButton = rootElement.querySelector('#consultant-reject');
  const workspaceAiPanel = rootElement.querySelector('#workspace-ai-panel');

  const syncGuideSurface = () => {
    const readyPayload = payload?.status === 'ready' ? payload : null;
    const starterLabel = getStarterLabel(readyPayload);
    const starterGuidance = getStarterGuidance(readyPayload);
    const starterId = readyPayload?.starter?.id ?? 'No starter metadata recorded.';
    const aiStatus = readyPayload?.ai.status ?? (fetchError ? 'error' : 'loading');
    const aiMessage = readyPayload?.ai.message ?? (fetchError ? fetchError : 'Checking AI state…');
    const tileAvailability = !readyPayload
      ? 'Waiting for workspace state…'
      : readyPayload.physics === 'design'
        ? 'Available now in this workspace'
        : 'Not available in this workspace yet';

    const starterChip = rootElement.querySelector('#starter-chip');
    if (starterChip instanceof HTMLElement) {
      starterChip.dataset.starterKind = readyPayload?.starter?.kind ?? 'custom';
      starterChip.textContent = `Starter · ${starterLabel}`;
    }

    const aiChip = rootElement.querySelector('#workspace-ai-chip');
    if (aiChip instanceof HTMLElement) {
      aiChip.dataset.aiStatus = aiStatus;
      aiChip.textContent = `AI · ${aiStatus}`;
    }

    if (workspaceAiPanel instanceof HTMLElement) {
      workspaceAiPanel.dataset.aiStatus = aiStatus;
      workspaceAiPanel.style.border = aiStatus === 'available'
        ? '1px solid rgba(96, 165, 250, 0.24)'
        : aiStatus === 'loading'
          ? '1px solid rgba(148, 163, 184, 0.2)'
          : '1px solid rgba(248, 113, 113, 0.28)';
      workspaceAiPanel.style.background = aiStatus === 'available'
        ? 'rgba(30, 41, 59, 0.72)'
        : aiStatus === 'loading'
          ? 'rgba(30, 41, 59, 0.56)'
          : 'rgba(69, 10, 10, 0.34)';
    }

    setText(rootElement, '#starter-kind', starterLabel);
    setText(rootElement, '#starter-id', starterId);
    setText(rootElement, '#starter-guidance', starterGuidance);
    setText(rootElement, '#workspace-ai-status', aiStatus);
    setText(rootElement, '#workspace-ai-note', aiMessage);
    setText(rootElement, '#tile-lens-availability', tileAvailability);
  };

  const syncConsultantSurface = () => {
    const currentPayload = payload?.status === 'ready' ? payload : null;
    const selectedFrameId = editorEngine.getSnapshot().selectedFrameId;
    const frameId = preview?.frameId ?? selectedFrameId ?? overflowDiagnostics.frameId;
    const previewVisible = preview !== null;
    const isDesignWorkspace = currentPayload?.physics === 'design';
    const aiCanRequest = currentPayload?.ai.status !== 'skipped';
    const canRequest = aiCanRequest && isDesignWorkspace && overflowDiagnostics.status === 'overflow' && consultantState !== 'requesting' && consultantState !== 'applying';
    const canAcceptOrReject = previewVisible && consultantState !== 'applying';
    const displayState: ConsultantUiState = (!previewVisible
      && consultantState !== 'requesting'
      && consultantState !== 'applying'
      && currentPayload
      && currentPayload.ai.status !== 'available')
      ? 'unavailable'
      : consultantState;
    const displayCode = displayState === 'unavailable' && currentPayload && currentPayload.ai.status !== 'available'
      ? currentPayload.ai.status
      : consultantCode;

    if (consultantPanel instanceof HTMLElement) {
      consultantPanel.dataset.consultantState = displayState;
      consultantPanel.dataset.consultantCode = displayCode;
      consultantPanel.style.border = displayState === 'error' || displayState === 'unavailable'
        ? '1px solid rgba(248, 113, 113, 0.35)'
        : displayState === 'preview'
          ? '1px solid rgba(45, 212, 191, 0.35)'
          : '1px solid rgba(96, 165, 250, 0.22)';
    }

    const statusNode = rootElement.querySelector('#consultant-status');
    if (statusNode instanceof HTMLElement) {
      statusNode.dataset.consultantState = displayState;
      statusNode.textContent = displayState;
    }

    const note = previewVisible
      ? 'Ghost preview is separate from canonical frame geometry until you accept it.'
      : consultantState === 'requesting'
        ? 'Requesting a structured resize proposal from the bridge consultant.'
        : consultantState === 'applying'
          ? 'Applying the preview through the canonical editor mutation route.'
          : consultantErrorMessage
            ? consultantErrorMessage
            : currentPayload && currentPayload.ai.status !== 'available'
              ? currentPayload.ai.message
              : !currentPayload
                ? 'Waiting for a ready workspace before requesting consultant help.'
                : !isDesignWorkspace
                  ? 'AI layout suggestions appear only when this workspace includes fixed frames.'
                  : consultantNote;
    setText(rootElement, '#consultant-state-note', note);

    const overflowLabel = overflowDiagnostics.status === 'overflow'
      ? `overflow · +${overflowDiagnostics.overflowPx ?? 0}px`
      : overflowDiagnostics.status;
    const overflowNode = rootElement.querySelector('#consultant-overflow-status');
    if (overflowNode instanceof HTMLElement) {
      overflowNode.dataset.overflowStatus = overflowDiagnostics.status;
      overflowNode.textContent = overflowLabel;
    }

    const frameNode = rootElement.querySelector('#consultant-frame-id');
    if (frameNode instanceof HTMLElement) {
      frameNode.dataset.frameId = frameId ?? '';
      frameNode.textContent = frameId ?? 'None';
    }

    const measurementsNode = rootElement.querySelector('#consultant-measurements');
    if (measurementsNode instanceof HTMLElement) {
      measurementsNode.dataset.overflowPx = overflowDiagnostics.overflowPx === null ? '' : String(overflowDiagnostics.overflowPx);
      measurementsNode.textContent = overflowDiagnostics.frameId
        ? overflowDiagnostics.measuredAvailableHeight === null || overflowDiagnostics.measuredContentHeight === null
          ? `Frame ${overflowDiagnostics.frameId} is settling before measurement.`
          : `Frame ${overflowDiagnostics.frameId}: content ${overflowDiagnostics.measuredContentHeight}px · available ${overflowDiagnostics.measuredAvailableHeight}px · overflow ${overflowDiagnostics.overflowPx ?? 0}px`
        : 'No overflow diagnostics recorded.';
    }

    const previewNode = rootElement.querySelector('#consultant-preview-state');
    if (previewNode instanceof HTMLElement) {
      previewNode.dataset.previewVisible = String(previewVisible);
      previewNode.textContent = previewVisible
        ? `Ghost preview active for ${preview?.frameId} at x:${preview?.box.x} y:${preview?.box.y} w:${preview?.box.width} h:${preview?.box.height}`
        : 'No ghost preview active.';
    }

    setText(
      rootElement,
      '#consultant-rationale',
      preview
        ? `${preview.rationale} (${Math.round(preview.confidence * 100)}% confidence)`
        : currentPayload && currentPayload.ai.status !== 'available'
          ? 'AI help is unavailable right now, but the canonical editor loop still works.'
          : 'Awaiting a consultant proposal.',
    );

    if (consultantError instanceof HTMLElement) {
      consultantError.hidden = !consultantErrorMessage;
      consultantError.textContent = consultantErrorMessage ?? 'No consultant errors recorded.';
    }

    setButtonState(requestButton, canRequest);
    setButtonState(acceptButton, canAcceptOrReject);
    setButtonState(rejectButton, canAcceptOrReject);
  };

  const syncBridgeSurface = () => {
    const bridgeStatusLabel = fetchError ? 'Fetch failed' : (payload ? payload.status : 'Loading');
    const payloadStatus = payload?.status ?? (fetchError ? 'fetch-error' : 'loading');

    if (bridgeStatus instanceof HTMLElement) {
      setBridgeStatusVisuals(bridgeStatus, payloadStatus, Boolean(fetchError) || payload?.status === 'error');
    }

    setText(rootElement, '#bridge-status-label', bridgeStatusLabel);
    setText(rootElement, '#bridge-last-signal', formatSignalLabel(lastSignal));
    setText(rootElement, '#workspace-root', payload?.workspaceRoot ?? 'Loading workspace root…');
    setText(rootElement, '#physics-mode', payload?.status === 'ready' ? payload.physics : 'Unavailable');
    setText(rootElement, '#document-path', payload?.documentPath ?? 'Unavailable');
    setText(rootElement, '#config-path', payload?.configPath ?? 'Unavailable');

    if (payloadPreview instanceof HTMLElement) {
      payloadPreview.textContent = JSON.stringify(payload ?? { status: 'loading', fetchError }, null, 2);
    }

    syncGuideSurface();

    if (payload?.status === 'ready') {
      const currentDocumentKey = createDocumentKey(payload);
      if (preview && preview.sourceDocumentKey !== currentDocumentKey) {
        preview = null;
        canvas.setGhostPreview(null);
        consultantState = 'idle';
        consultantCode = 'preview_stale_cleared';
        consultantNote = 'Ghost preview cleared because the canonical document changed.';
      }

      canvas.setReadyPayload(payload);

      if (errorPanel instanceof HTMLElement) {
        errorPanel.hidden = true;
      }
      if (errorIssues instanceof HTMLElement) {
        errorIssues.innerHTML = '';
      }
      syncConsultantSurface();
      return;
    }

    canvas.clear(fetchError ?? payload?.message ?? 'Waiting for a ready document payload…');
    preview = null;
    consultantState = 'idle';
    consultantCode = 'none';
    consultantNote = 'Select a design frame to inspect overflow.';
    consultantErrorMessage = null;

    if (errorPanel instanceof HTMLElement) {
      errorPanel.hidden = false;
    }
    setText(rootElement, '#bridge-error-name', payload?.status === 'error' ? payload.name : 'Fetch error');
    setText(rootElement, '#bridge-error-message', fetchError ?? (payload?.status === 'error' ? payload.message : 'Fetching bridge payload…'));

    if (errorIssues instanceof HTMLElement) {
      errorIssues.innerHTML = '';
      if (payload?.status === 'error' && Array.isArray(payload.issues)) {
        payload.issues.forEach((issue) => {
          const item = document.createElement('li');
          item.textContent = `${issue.path} · ${issue.message}`;
          errorIssues.append(item);
        });
      }
    }

    syncConsultantSurface();
  };

  const syncSaveSurface = (editorStatus: BridgeEditorStatusSnapshot) => {
    if (saveStatus instanceof HTMLElement) {
      setSaveStatusVisuals(saveStatus, editorStatus);
    }

    setText(rootElement, '#editor-save-state-label', editorStatus.saveState);
    setText(rootElement, '#editor-save-error', editorStatus.errorMessage ?? 'No save errors recorded.');
  };

  const refreshBridge = async (signal?: AbortSignal) => {
    try {
      const nextPayload = await fetchBridgePayload(signal);
      payload = nextPayload;
      fetchError = null;
      editorEngine.setPayload(nextPayload.status === 'ready' ? nextPayload : null);
    } catch (error) {
      payload = null;
      fetchError = error instanceof Error ? error.message : String(error);
      editorEngine.setPayload(null);
    }
    syncBridgeSurface();
  };

  const requestConsultantProposal = async () => {
    const readyPayload = payload?.status === 'ready' ? payload : null;
    if (!readyPayload || readyPayload.physics !== 'design' || overflowDiagnostics.status !== 'overflow' || !overflowDiagnostics.frameId) {
      consultantState = 'idle';
      consultantCode = 'request_skipped';
      consultantNote = 'A consultant proposal is only available for overflowing placed frames.';
      syncConsultantSurface();
      return;
    }

    if (readyPayload.ai.status === 'skipped') {
      consultantState = 'unavailable';
      consultantCode = readyPayload.ai.status;
      consultantErrorMessage = null;
      consultantNote = readyPayload.ai.message;
      syncConsultantSurface();
      return;
    }

    activeConsultantRequest?.abort();
    activeConsultantRequest = new AbortController();
    consultantState = 'requesting';
    consultantCode = 'requesting';
    consultantErrorMessage = null;
    syncConsultantSurface();

    const result = await requestBridgeLayoutConsultant(
      {
        frameId: overflowDiagnostics.frameId,
        issue: {
          kind: 'overflow',
          measuredContentHeight: overflowDiagnostics.measuredContentHeight ?? 1,
          measuredAvailableHeight: overflowDiagnostics.measuredAvailableHeight ?? 1,
        },
      },
      { signal: activeConsultantRequest.signal },
    ).catch((error) => {
      return {
        ok: false,
        status: 'unavailable',
        code: 'provider_unavailable',
        workspaceRoot: readyPayload.workspaceRoot,
        documentPath: readyPayload.documentPath,
        configPath: readyPayload.configPath,
        canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
        message: error instanceof Error ? error.message : String(error),
        name: 'BridgeConsultantError',
      } as BridgeConsultantResult;
    });

    if (activeConsultantRequest.signal.aborted) {
      return;
    }
    activeConsultantRequest = null;

    if (result.ok) {
      preview = {
        frameId: result.proposal.frameId,
        box: result.proposal.box,
        rationale: result.proposal.rationale,
        confidence: result.proposal.confidence,
        sourceDocumentKey: createDocumentKey(readyPayload) ?? '',
      };
      canvas.setGhostPreview(preview);
      consultantState = 'preview';
      consultantCode = result.code;
      consultantNote = 'Ghost preview ready. Accept to persist or reject to discard without writing.';
      consultantErrorMessage = null;
      syncConsultantSurface();
      return;
    }

    preview = null;
    canvas.setGhostPreview(null);
    consultantState = mapConsultantFailureState(result);
    consultantCode = result.code;
    consultantErrorMessage = `${result.code}: ${result.message}`;
    consultantNote = 'Consultant request did not produce a preview.';
    syncConsultantSurface();
  };

  const acceptPreview = async () => {
    const readyPayload = payload?.status === 'ready' ? payload : null;
    if (!readyPayload || !preview) {
      return;
    }

    consultantState = 'applying';
    consultantCode = 'applying';
    consultantErrorMessage = null;
    syncConsultantSurface();

    const candidate = composeFrameResizeCandidate(readyPayload.document, preview.frameId, preview.box);
    const result = await submitBridgeDocumentMutation(candidate, { statusStore: editorStatusStore });
    if (result.ok) {
      preview = null;
      canvas.setGhostPreview(null);
      consultantState = 'idle';
      consultantCode = 'accepted';
      consultantNote = 'Proposal accepted and persisted through the canonical editor route.';
      consultantErrorMessage = null;
      syncConsultantSurface();
      void refreshBridge();
      return;
    }

    consultantState = 'error';
    consultantCode = result.code;
    consultantErrorMessage = `${result.code}: ${result.message}`;
    consultantNote = 'Save failed while applying the ghost preview.';
    syncConsultantSurface();
  };

  const rejectPreview = () => {
    preview = null;
    canvas.setGhostPreview(null);
    consultantState = 'idle';
    consultantCode = 'rejected';
    consultantErrorMessage = null;
    consultantNote = 'Ghost preview rejected. Canonical document unchanged.';
    syncConsultantSurface();
  };

  if (requestButton instanceof HTMLButtonElement) {
    requestButton.addEventListener('click', () => {
      void requestConsultantProposal();
    });
  }
  if (acceptButton instanceof HTMLButtonElement) {
    acceptButton.addEventListener('click', () => {
      void acceptPreview();
    });
  }
  if (rejectButton instanceof HTMLButtonElement) {
    rejectButton.addEventListener('click', rejectPreview);
  }

  syncBridgeSurface();
  syncSaveSurface(editorStatusStore.getSnapshot());
  syncConsultantSurface();

  const abortController = new AbortController();
  void refreshBridge(abortController.signal);

  const unsubscribeStatus = editorStatusStore.subscribe((editorStatus) => {
    syncSaveSurface(editorStatus);
  });

  const unsubscribeEngine = editorEngine.subscribe((snapshot) => {
    if (!preview && consultantState !== 'requesting' && consultantState !== 'applying') {
      consultantState = snapshot.interactionMode === 'design' && snapshot.selectedFrameId ? 'detecting' : 'idle';
      consultantCode = snapshot.interactionMode === 'design' && snapshot.selectedFrameId ? 'measuring' : consultantCode === 'preview_stale_cleared' ? consultantCode : 'none';
      if (snapshot.interactionMode !== 'design') {
        consultantNote = 'Overflow detection runs only where frames are present.';
      } else if (!snapshot.selectedFrameId) {
        consultantNote = 'Select a design frame to inspect overflow.';
      }
    }
    syncConsultantSurface();
  });

  const unsubscribeSignals = subscribeToBridgeSignals((signal) => {
    lastSignal = signal;
    syncBridgeSurface();
    void refreshBridge();
  });

  return () => {
    abortController.abort();
    activeConsultantRequest?.abort();
    unsubscribeStatus();
    unsubscribeEngine();
    unsubscribeSignals();
    canvas.destroy();
    editorEngine.destroy();
  };
}
