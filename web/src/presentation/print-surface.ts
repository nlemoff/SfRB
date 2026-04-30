import { BRIDGE_BOOTSTRAP_PATH, type ReadyBridgePayload } from '../bridge-client';
import { renderPrintableResume, type PrintableResumeState } from './render-printable-resume';

export type PrintSurfaceMode = 'preview' | 'artifact';

export type PrintSurfaceOptions = {
  mode: PrintSurfaceMode;
};

export async function mountPrintSurface(
  rootElement: HTMLElement,
  options: PrintSurfaceOptions,
): Promise<PrintableResumeState> {
  rootElement.setAttribute('data-print-surface', 'true');
  rootElement.setAttribute('data-surface-mode', options.mode);
  rootElement.setAttribute('data-export-state', 'blocked');
  rootElement.setAttribute('data-overflow-status', 'unknown');
  rootElement.setAttribute('data-blocked-reason', 'loading');
  rootElement.setAttribute('data-risk-count', '0');
  rootElement.setAttribute('data-max-overflow-px', '0');

  let payload: ReadyBridgePayload;

  try {
    const response = await fetch(BRIDGE_BOOTSTRAP_PATH, {
      headers: { accept: 'application/json' },
    });
    const data = await response.json();

    if (data.status !== 'ready') {
      const blockedState: PrintableResumeState = {
        pageCount: 0,
        renderSupport: 'unsupported',
        exportState: 'blocked',
        overflowStatus: 'unknown',
        blockedReason: 'payload-error',
        riskCount: 0,
        maxOverflowPx: 0,
      };
      applyRootDiagnostics(rootElement, blockedState);
      return blockedState;
    }

    payload = data as ReadyBridgePayload;
  } catch {
    const errorState: PrintableResumeState = {
      pageCount: 0,
      renderSupport: 'unsupported',
      exportState: 'blocked',
      overflowStatus: 'unknown',
      blockedReason: 'fetch-failed',
      riskCount: 0,
      maxOverflowPx: 0,
    };
    applyRootDiagnostics(rootElement, errorState);
    return errorState;
  }

  return renderPrintableResume(rootElement, payload, options.mode);
}

function applyRootDiagnostics(rootElement: HTMLElement, state: PrintableResumeState): void {
  rootElement.setAttribute('data-export-state', state.exportState);
  rootElement.setAttribute('data-overflow-status', state.overflowStatus);
  rootElement.setAttribute('data-blocked-reason', state.blockedReason ?? '');
  rootElement.setAttribute('data-risk-count', String(state.riskCount));
  rootElement.setAttribute('data-max-overflow-px', String(state.maxOverflowPx));
}
