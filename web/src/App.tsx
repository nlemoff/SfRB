import { TEMPLATE_IDS, type TemplateId } from '../../src/document/templates/registry';
import {
  type BridgeConsultantResult,
  type BridgeEditorStatusSnapshot,
  type BridgeMutationResult,
  type BridgePayload,
  type BridgeSignal,
  type ReadyBridgePayload,
  BRIDGE_BOOTSTRAP_PATH,
  BRIDGE_PRINT_PATH,
  createBridgeEditorStatusStore,
  fetchBridgePayload,
  requestBridgeLayoutConsultant,
  subscribeToBridgeSignals,
} from './bridge-client';
import { mountCanvas, type CanvasConsultantPreview, type CanvasOverflowDiagnostics } from './editor/canvas';
import { createDocumentEditorEngine } from './editor/engine';
import { syncConsultantPanel } from './shell/consultant-panel';
import { bindLensSwitcher } from './shell/lens-switcher';
import { createShellMarkup } from './shell/markup';
import { injectShellStyles } from './shell/styles';
import {
  renderTemplateButtons,
  setTemplatePickerNote,
  syncBridgePanels,
  syncErrorPanel,
  syncExportPanel,
  syncGuidancePanels,
  syncSavePanel,
  syncTemplatePicker,
} from './shell/workspace-panels';

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
  injectShellStyles();
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

  const lensSwitcher = bindLensSwitcher(rootElement, editorEngine);

  const syncGuideSurface = () => {
    const readyPayload = payload?.status === 'ready' ? payload : null;
    const aiStatus = readyPayload?.ai.status ?? (fetchError ? 'error' : 'loading');

    syncGuidancePanels(rootElement, {
      starterKindAttr: readyPayload?.starter?.kind ?? 'custom',
      starterLabel: getStarterLabel(readyPayload),
      starterId: readyPayload?.starter?.id ?? 'No starter metadata recorded.',
      starterGuidance: getStarterGuidance(readyPayload),
      aiStatus,
      aiMessage: readyPayload?.ai.message ?? (fetchError ? fetchError : 'Checking AI state…'),
    });

    lensSwitcher.sync(readyPayload);
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

    const rationale = preview
      ? `${preview.rationale} (${Math.round(preview.confidence * 100)}% confidence)`
      : currentPayload && currentPayload.ai.status !== 'available'
        ? 'AI help is unavailable right now, but the canonical editor loop still works.'
        : 'Awaiting a consultant proposal.';

    syncConsultantPanel(rootElement, {
      displayState,
      displayCode,
      note,
      overflow: overflowDiagnostics,
      frameId,
      previewVisible,
      preview,
      rationale,
      errorMessage: consultantErrorMessage,
      canRequest,
      canAcceptOrReject,
    });
  };

  const syncBridgeSurface = () => {
    syncBridgePanels(rootElement, {
      statusLabel: fetchError ? 'Fetch failed' : (payload ? payload.status : 'Loading'),
      payloadStatus: payload?.status ?? (fetchError ? 'fetch-error' : 'loading'),
      lastSignalLabel: formatSignalLabel(lastSignal),
      workspaceRoot: payload?.workspaceRoot ?? 'Loading workspace root…',
      physics: payload?.status === 'ready' ? payload.physics : 'Unavailable',
      documentPath: payload?.documentPath ?? 'Unavailable',
      configPath: payload?.configPath ?? 'Unavailable',
      payloadJson: JSON.stringify(payload ?? { status: 'loading', fetchError }, null, 2),
    });

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
      syncErrorPanel(rootElement, { visible: false, name: '', message: '', issues: [] });
      syncConsultantSurface();
      return;
    }

    canvas.clear(fetchError ?? payload?.message ?? 'Waiting for a ready document payload…');
    preview = null;
    consultantState = 'idle';
    consultantCode = 'none';
    consultantNote = 'Select a design frame to inspect overflow.';
    consultantErrorMessage = null;

    syncErrorPanel(rootElement, {
      visible: true,
      name: payload?.status === 'error' ? payload.name : 'Fetch error',
      message: fetchError ?? (payload?.status === 'error' ? payload.message : 'Fetching bridge payload…'),
      issues: payload?.status === 'error' && Array.isArray(payload.issues) ? payload.issues : [],
    });

    syncConsultantSurface();
  };

  const syncSaveSurface = (editorStatus: BridgeEditorStatusSnapshot) => {
    syncSavePanel(rootElement, editorStatus);
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
    syncTemplateSurface();
    void readBridgePrintSurfaceSnapshot();
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

  // Focus returns to the request control after accept/reject: focusing the
  // canvas frame would re-trigger selection and overwrite the terminal
  // accepted/rejected code surface.
  const focusConsultantRequest = () => {
    const button = rootElement.querySelector('#consultant-request');
    if (button instanceof HTMLElement) {
      button.focus();
    }
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

    const result = await editorEngine.dispatch({ op: 'set-frame-box', frameId: preview.frameId, box: preview.box });
    if (result.ok) {
      preview = null;
      canvas.setGhostPreview(null);
      consultantState = 'idle';
      consultantCode = 'accepted';
      consultantNote = 'Proposal accepted and persisted through the canonical editor route.';
      consultantErrorMessage = null;
      syncConsultantSurface();
      focusConsultantRequest();
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
    focusConsultantRequest();
  };

  const requestButton = rootElement.querySelector('#consultant-request');
  const acceptButton = rootElement.querySelector('#consultant-accept');
  const rejectButton = rootElement.querySelector('#consultant-reject');
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

  // --- Template picker ---
  const syncTemplateSurface = () => {
    const activeId: TemplateId = payload?.status === 'ready'
      ? (payload.document.metadata.template?.id ?? 'default')
      : 'default';
    syncTemplatePicker(rootElement, activeId);
  };

  const applyTemplateSelection = async (id: TemplateId): Promise<void> => {
    if (payload?.status !== 'ready') {
      setTemplatePickerNote(rootElement, 'Cannot apply template: workspace is not ready.', 'not_ready');
      return;
    }
    setTemplatePickerNote(rootElement, `Applying ${id}…`);
    let result: BridgeMutationResult;
    try {
      result = await editorEngine.dispatch({ op: 'set-template', templateId: id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTemplatePickerNote(rootElement, `Template apply failed: bridge_unavailable${message ? ` — ${message}` : ''}`, 'bridge_unavailable');
      return;
    }

    if (result.ok) {
      setTemplatePickerNote(rootElement, `Applied ${id}.`);
      void refreshBridge();
      return;
    }

    setTemplatePickerNote(rootElement, `Template apply failed: ${result.code}${result.message ? ` — ${result.message}` : ''}`, result.code);
  };

  renderTemplateButtons(rootElement, TEMPLATE_IDS, (id) => {
    void applyTemplateSelection(id);
  });
  syncTemplateSurface();

  // --- Export surface ---
  let exportState = 'loading';
  let exportNote = 'Probing the shared export surface for readiness.';

  const syncExportSurface = () => {
    syncExportPanel(rootElement, { state: exportState, note: exportNote });
  };

  const readBridgePrintSurfaceSnapshot = async (): Promise<void> => {
    const currentPayload = payload?.status === 'ready' ? payload : null;
    if (!currentPayload) {
      exportState = 'loading';
      exportNote = 'Waiting for a ready workspace before probing the export surface.';
      syncExportSurface();
      return;
    }

    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `${BRIDGE_PRINT_PATH}?mode=artifact`;
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => {
        iframe.addEventListener('load', () => resolve(), { once: true });
        setTimeout(resolve, 8000);
      });

      const iframeRoot = iframe.contentDocument?.getElementById('root');
      if (iframeRoot) {
        // Wait for export-state to settle
        const waitStart = Date.now();
        while (Date.now() - waitStart < 5000) {
          const state = iframeRoot.getAttribute('data-export-state');
          const reason = iframeRoot.getAttribute('data-blocked-reason');
          if (state && (state !== 'blocked' || reason !== 'loading')) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        exportState = iframeRoot.getAttribute('data-export-state') ?? 'blocked';
        const overflowStatus = iframeRoot.getAttribute('data-overflow-status') ?? 'unknown';
        const riskCount = iframeRoot.getAttribute('data-risk-count') ?? '0';
        const maxOverflowPx = iframeRoot.getAttribute('data-max-overflow-px') ?? '0';
        const blockedReason = iframeRoot.getAttribute('data-blocked-reason') ?? '';

        if (exportState === 'ready') {
          exportNote = `Export surface reports ready. Overflow: ${overflowStatus}.`;
        } else if (exportState === 'risk') {
          exportNote = `Export at risk: ${riskCount} overflow(s), max ${maxOverflowPx}px. Resolve before exporting.`;
        } else {
          exportNote = `Export blocked: ${blockedReason || 'unknown reason'}.`;
        }
      } else {
        exportState = 'blocked';
        exportNote = 'Could not probe the export surface iframe.';
      }

      iframe.remove();
    } catch {
      exportState = 'blocked';
      exportNote = 'Export surface probe failed.';
    }

    syncExportSurface();
  };

  const exportPreviewButton = rootElement.querySelector('#export-preview');
  if (exportPreviewButton instanceof HTMLButtonElement) {
    exportPreviewButton.addEventListener('click', () => {
      if (exportState !== 'ready') return;
      window.open(BRIDGE_PRINT_PATH, 'sfrb-export-preview', 'width=660,height=860');
    });
  }

  syncBridgeSurface();
  syncSaveSurface(editorStatusStore.getSnapshot());
  syncConsultantSurface();
  syncExportSurface();

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
    lensSwitcher.sync(payload?.status === 'ready' ? payload : null);
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
