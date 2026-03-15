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

type ConsultantUiState = 'idle' | 'detecting' | 'requesting' | 'preview' | 'applying' | 'error' | 'unavailable';

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
            <section id="consultant-panel" data-testid="consultant-panel" data-consultant-state="idle" data-consultant-code="none" style="padding: 18px; border-radius: 18px; background: rgba(15, 23, 42, 0.58); border: 1px solid rgba(96, 165, 250, 0.22); display: grid; gap: 12px;">
              <div>
                <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">AI layout consultant</div>
                <div id="consultant-status" data-testid="consultant-status" data-consultant-state="idle" style="margin-top: 10px; font-size: 1.2rem; font-weight: 700;">idle</div>
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

  const syncConsultantSurface = () => {
    const currentPayload = payload?.status === 'ready' ? payload : null;
    const selectedFrameId = editorEngine.getSnapshot().selectedFrameId;
    const frameId = preview?.frameId ?? selectedFrameId ?? overflowDiagnostics.frameId;
    const previewVisible = preview !== null;
    const isDesignMode = currentPayload?.physics === 'design';
    const canRequest = isDesignMode && overflowDiagnostics.status === 'overflow' && consultantState !== 'requesting' && consultantState !== 'applying';
    const canAcceptOrReject = previewVisible && consultantState !== 'applying';

    if (consultantPanel instanceof HTMLElement) {
      consultantPanel.dataset.consultantState = consultantState;
      consultantPanel.dataset.consultantCode = consultantCode;
      consultantPanel.style.border = consultantState === 'error' || consultantState === 'unavailable'
        ? '1px solid rgba(248, 113, 113, 0.35)'
        : consultantState === 'preview'
          ? '1px solid rgba(45, 212, 191, 0.35)'
          : '1px solid rgba(96, 165, 250, 0.22)';
    }

    const statusNode = rootElement.querySelector('#consultant-status');
    if (statusNode instanceof HTMLElement) {
      statusNode.dataset.consultantState = consultantState;
      statusNode.textContent = consultantState;
    }

    const note = previewVisible
      ? 'Ghost preview is separate from canonical frame geometry until you accept it.'
      : consultantState === 'requesting'
        ? 'Requesting a structured resize proposal from the bridge consultant.'
        : consultantState === 'applying'
          ? 'Applying the preview through the canonical editor mutation route.'
          : consultantErrorMessage
            ? consultantErrorMessage
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
      consultantNote = 'A consultant proposal is only available for overflowing design frames.';
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
        consultantNote = 'Overflow detection runs only in design mode.';
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
