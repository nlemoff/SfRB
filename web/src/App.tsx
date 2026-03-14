import {
  type BridgeEditorStatusSnapshot,
  type BridgePayload,
  type BridgeSignal,
  BRIDGE_BOOTSTRAP_PATH,
  createBridgeEditorStatusStore,
  fetchBridgePayload,
  subscribeToBridgeSignals,
} from './bridge-client';
import { mountCanvas } from './editor/Canvas';
import { createDocumentEditorEngine } from './editor/engine';

const pageStyles = [
  'min-height: 100vh',
  'margin: 0',
  'background: radial-gradient(circle at top, rgba(71, 141, 255, 0.2), transparent 32%), linear-gradient(180deg, #081120 0%, #05070d 100%)',
  'color: #f6f7fb',
  'font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif',
].join('; ');

const shellStyles = ['max-width: 1180px', 'margin: 0 auto', 'padding: 48px 24px 80px'].join('; ');
const panelStyles = [
  'background: rgba(7, 12, 24, 0.74)',
  'border: 1px solid rgba(148, 163, 184, 0.24)',
  'border-radius: 24px',
  'box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35)',
  'backdrop-filter: blur(20px)',
].join('; ');

const previewStyles = [
  'margin-top: 16px',
  'padding: 18px',
  'border-radius: 18px',
  'background: rgba(2, 6, 23, 0.88)',
  'overflow: auto',
  'font-size: 0.82rem',
  'line-height: 1.5',
  'color: #bfdbfe',
  'max-height: 720px',
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

function createShellMarkup(): string {
  return `
    <main style="${pageStyles}">
      <div style="${shellStyles}">
        <section style="${panelStyles}; padding: 32px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
            <div>
              <p style="margin: 0; letter-spacing: 0.22em; text-transform: uppercase; color: #93c5fd; font-size: 0.76rem;">SfRB local web bridge</p>
              <h1 style="margin: 12px 0 8px; font-size: clamp(2.4rem, 6vw, 4.5rem); line-height: 0.94;">DOM-first editing across both physics modes.</h1>
              <p style="margin: 0; max-width: 58ch; color: #cbd5e1; font-size: 1.02rem; line-height: 1.6;">
                The browser shell renders canonical workspace state from <code>${BRIDGE_BOOTSTRAP_PATH}</code> and commits inline text edits plus design-frame geometry changes through the validated bridge mutation route.
              </p>
            </div>
            <div style="min-width: 280px; flex: 1 1 320px; display: grid; gap: 14px;">
              <div id="bridge-status" data-testid="bridge-status" data-status="loading" style="border-radius: 18px; padding: 18px 20px; background: rgba(15, 118, 110, 0.28); border: 1px solid rgba(45, 212, 191, 0.45);">
                <div style="font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; color: #cbd5e1;">Bridge status</div>
                <div id="bridge-status-label" style="margin-top: 10px; font-size: 1.35rem; font-weight: 700;">Loading</div>
                <div id="bridge-last-signal" data-testid="bridge-last-signal" style="margin-top: 8px; color: #dbeafe;">Waiting for bridge events</div>
              </div>
              <div id="editor-save-status" data-testid="editor-save-status" data-save-state="idle" style="border-radius: 18px; padding: 18px 20px; background: rgba(51, 65, 85, 0.34); border: 1px solid rgba(148, 163, 184, 0.28);">
                <div style="font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; color: #cbd5e1;">Editor save state</div>
                <div id="editor-save-state-label" style="margin-top: 10px; font-size: 1.1rem; font-weight: 700;">idle</div>
                <div id="editor-save-error" data-testid="editor-save-error" style="margin-top: 8px; color: #dbeafe;">No save errors recorded.</div>
              </div>
            </div>
          </div>
        </section>

        <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-bottom: 24px;">
          <article style="${panelStyles}; padding: 22px;">
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Workspace root</div>
            <div id="workspace-root" data-testid="workspace-root" style="margin-top: 12px; word-break: break-word; line-height: 1.5;">Loading workspace root…</div>
          </article>
          <article style="${panelStyles}; padding: 22px;">
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Physics mode</div>
            <div id="physics-mode" data-testid="physics-mode" style="margin-top: 12px; font-size: 1.9rem;">Unavailable</div>
          </article>
          <article style="${panelStyles}; padding: 22px;">
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Document path</div>
            <div id="document-path" data-testid="document-path" style="margin-top: 12px; word-break: break-word; line-height: 1.5;">Loading document path…</div>
          </article>
          <article style="${panelStyles}; padding: 22px;">
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Config path</div>
            <div id="config-path" data-testid="config-path" style="margin-top: 12px; word-break: break-word; line-height: 1.5;">Loading config path…</div>
          </article>
        </section>

        <section style="display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr); gap: 24px; align-items: start;">
          <article style="${panelStyles}; padding: 28px;">
            <div id="editor-host"></div>
          </article>
          <article style="${panelStyles}; padding: 30px; display: grid; gap: 16px;">
            <div>
              <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Canonical payload preview</div>
              <pre id="bridge-payload-preview" data-testid="bridge-payload-preview" style="${previewStyles}">Loading bridge payload…</pre>
            </div>
            <div id="bridge-error-panel" data-testid="bridge-error-panel" hidden style="padding: 18px; border-radius: 18px; background: rgba(127, 29, 29, 0.35); border: 1px solid rgba(248, 113, 113, 0.45);">
              <div style="color: #fca5a5; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Invalid workspace state</div>
              <h2 id="bridge-error-name" style="margin: 14px 0 10px; font-size: 1.5rem;">Waiting for payload</h2>
              <p id="bridge-error-message" data-testid="bridge-error-message" style="color: #fee2e2; line-height: 1.6; margin: 0;">Fetching bridge payload…</p>
              <ul id="bridge-error-issues" data-testid="bridge-error-issues" style="margin: 16px 0 0; padding-left: 18px; display: grid; gap: 8px; color: #fecaca;"></ul>
            </div>
          </article>
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
  container.style.background = isError ? 'rgba(127, 29, 29, 0.46)' : 'rgba(15, 118, 110, 0.28)';
  container.style.border = isError ? '1px solid rgba(248, 113, 113, 0.55)' : '1px solid rgba(45, 212, 191, 0.45)';
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

export function mountApp(rootElement: HTMLElement) {
  rootElement.innerHTML = createShellMarkup();

  const editorStatusStore = createBridgeEditorStatusStore();
  const editorEngine = createDocumentEditorEngine({ statusStore: editorStatusStore });
  const editorHost = rootElement.querySelector('#editor-host');
  if (!(editorHost instanceof HTMLElement)) {
    throw new Error('Missing #editor-host for editor canvas mount.');
  }
  const canvas = mountCanvas(editorHost, editorEngine);

  const bridgeStatus = rootElement.querySelector('#bridge-status');
  const saveStatus = rootElement.querySelector('#editor-save-status');
  const errorPanel = rootElement.querySelector('#bridge-error-panel');
  const errorIssues = rootElement.querySelector('#bridge-error-issues');
  const payloadPreview = rootElement.querySelector('#bridge-payload-preview');

  let payload: BridgePayload | null = null;
  let lastSignal: BridgeSignal | null = null;
  let fetchError: string | null = null;

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

    if (payload?.status === 'ready') {
      canvas.setReadyPayload(payload);

      if (errorPanel instanceof HTMLElement) {
        errorPanel.hidden = true;
      }
      if (errorIssues instanceof HTMLElement) {
        errorIssues.innerHTML = '';
      }
      return;
    }

    canvas.clear(fetchError ?? payload?.message ?? 'Waiting for a ready document payload…');

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

  syncBridgeSurface();
  syncSaveSurface(editorStatusStore.getSnapshot());

  const abortController = new AbortController();
  void refreshBridge(abortController.signal);

  const unsubscribeStatus = editorStatusStore.subscribe((editorStatus) => {
    syncSaveSurface(editorStatus);
  });

  const unsubscribeSignals = subscribeToBridgeSignals((signal) => {
    lastSignal = signal;
    syncBridgeSurface();
    void refreshBridge();
  });

  return () => {
    abortController.abort();
    unsubscribeStatus();
    unsubscribeSignals();
    canvas.destroy();
    editorEngine.destroy();
  };
}
