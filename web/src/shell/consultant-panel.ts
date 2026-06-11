import type { CanvasConsultantPreview, CanvasOverflowDiagnostics } from '../editor/canvas';

export type ConsultantPanelModel = {
  displayState: string;
  displayCode: string;
  note: string;
  overflow: CanvasOverflowDiagnostics;
  frameId: string | null;
  previewVisible: boolean;
  preview: CanvasConsultantPreview | null;
  rationale: string;
  errorMessage: string | null;
  canRequest: boolean;
  canAcceptOrReject: boolean;
};

function setText(root: ParentNode, selector: string, value: string): void {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function setButtonEnabled(root: ParentNode, selector: string, enabled: boolean): void {
  const button = root.querySelector(selector);
  if (button instanceof HTMLButtonElement) {
    button.disabled = !enabled;
  }
}

export function syncConsultantPanel(rootElement: HTMLElement, model: ConsultantPanelModel): void {
  const consultantPanel = rootElement.querySelector('#consultant-panel');
  if (consultantPanel instanceof HTMLElement) {
    consultantPanel.dataset.consultantState = model.displayState;
    consultantPanel.dataset.consultantCode = model.displayCode;
  }

  const statusNode = rootElement.querySelector('#consultant-status');
  if (statusNode instanceof HTMLElement) {
    statusNode.dataset.consultantState = model.displayState;
    statusNode.textContent = model.displayState;
  }

  setText(rootElement, '#consultant-state-note', model.note);

  const overflowLabel = model.overflow.status === 'overflow'
    ? `overflow · +${model.overflow.overflowPx ?? 0}px`
    : model.overflow.status;
  const overflowNode = rootElement.querySelector('#consultant-overflow-status');
  if (overflowNode instanceof HTMLElement) {
    overflowNode.dataset.overflowStatus = model.overflow.status;
    overflowNode.textContent = overflowLabel;
  }

  const frameNode = rootElement.querySelector('#consultant-frame-id');
  if (frameNode instanceof HTMLElement) {
    frameNode.dataset.frameId = model.frameId ?? '';
    frameNode.textContent = model.frameId ?? 'None';
  }

  const measurementsNode = rootElement.querySelector('#consultant-measurements');
  if (measurementsNode instanceof HTMLElement) {
    measurementsNode.dataset.overflowPx = model.overflow.overflowPx === null ? '' : String(model.overflow.overflowPx);
    measurementsNode.textContent = model.overflow.frameId
      ? model.overflow.measuredAvailableHeight === null || model.overflow.measuredContentHeight === null
        ? `Frame ${model.overflow.frameId} is settling before measurement.`
        : `Frame ${model.overflow.frameId}: content ${model.overflow.measuredContentHeight}px · available ${model.overflow.measuredAvailableHeight}px · overflow ${model.overflow.overflowPx ?? 0}px`
      : 'No overflow diagnostics recorded.';
  }

  const previewNode = rootElement.querySelector('#consultant-preview-state');
  if (previewNode instanceof HTMLElement) {
    previewNode.dataset.previewVisible = String(model.previewVisible);
    previewNode.textContent = model.previewVisible
      ? `Ghost preview active for ${model.preview?.frameId} at x:${model.preview?.box.x} y:${model.preview?.box.y} w:${model.preview?.box.width} h:${model.preview?.box.height}`
      : 'No ghost preview active.';
  }

  setText(rootElement, '#consultant-rationale', model.rationale);

  const consultantError = rootElement.querySelector('#consultant-error');
  if (consultantError instanceof HTMLElement) {
    consultantError.hidden = !model.errorMessage;
    consultantError.textContent = model.errorMessage ?? 'No consultant errors recorded.';
  }

  setButtonEnabled(rootElement, '#consultant-request', model.canRequest);
  setButtonEnabled(rootElement, '#consultant-accept', model.canAcceptOrReject);
  setButtonEnabled(rootElement, '#consultant-reject', model.canAcceptOrReject);
}
