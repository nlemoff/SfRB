import type { BridgeEditorStatusSnapshot, BridgeValidationIssue } from '../bridge-client';
import type { TemplateId } from '../../../src/document/templates/registry';

function setText(root: ParentNode, selector: string, value: string): void {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

export type GuidancePanelModel = {
  starterKindAttr: string;
  starterLabel: string;
  starterId: string;
  starterGuidance: string;
  aiStatus: string;
  aiMessage: string;
};

export function syncGuidancePanels(rootElement: HTMLElement, model: GuidancePanelModel): void {
  const starterChip = rootElement.querySelector('#starter-chip');
  if (starterChip instanceof HTMLElement) {
    starterChip.dataset.starterKind = model.starterKindAttr;
    starterChip.textContent = `Starter · ${model.starterLabel}`;
  }

  const aiChip = rootElement.querySelector('#workspace-ai-chip');
  if (aiChip instanceof HTMLElement) {
    aiChip.dataset.aiStatus = model.aiStatus;
    aiChip.textContent = `AI · ${model.aiStatus}`;
  }

  const workspaceAiPanel = rootElement.querySelector('#workspace-ai-panel');
  if (workspaceAiPanel instanceof HTMLElement) {
    workspaceAiPanel.dataset.aiStatus = model.aiStatus;
  }

  setText(rootElement, '#starter-kind', model.starterLabel);
  setText(rootElement, '#starter-id', model.starterId);
  setText(rootElement, '#starter-guidance', model.starterGuidance);
  setText(rootElement, '#workspace-ai-status', model.aiStatus);
  setText(rootElement, '#workspace-ai-note', model.aiMessage);
}

export function syncSavePanel(rootElement: HTMLElement, editorStatus: BridgeEditorStatusSnapshot): void {
  const saveStatus = rootElement.querySelector('#editor-save-status');
  if (saveStatus instanceof HTMLElement) {
    saveStatus.dataset.saveState = editorStatus.saveState;
  }

  setText(rootElement, '#editor-save-state-label', editorStatus.saveState);
  setText(rootElement, '#editor-save-error', editorStatus.errorMessage ?? 'No save errors recorded.');
}

export type BridgePanelModel = {
  statusLabel: string;
  payloadStatus: string;
  lastSignalLabel: string;
  workspaceRoot: string;
  physics: string;
  documentPath: string;
  configPath: string;
  payloadJson: string;
};

export function syncBridgePanels(rootElement: HTMLElement, model: BridgePanelModel): void {
  const bridgeStatus = rootElement.querySelector('#bridge-status');
  if (bridgeStatus instanceof HTMLElement) {
    bridgeStatus.dataset.status = model.payloadStatus;
  }

  setText(rootElement, '#bridge-status-label', model.statusLabel);
  setText(rootElement, '#bridge-last-signal', model.lastSignalLabel);
  setText(rootElement, '#workspace-root', model.workspaceRoot);
  setText(rootElement, '#physics-mode', model.physics);
  setText(rootElement, '#document-path', model.documentPath);
  setText(rootElement, '#config-path', model.configPath);

  const payloadPreview = rootElement.querySelector('#bridge-payload-preview');
  if (payloadPreview instanceof HTMLElement) {
    payloadPreview.textContent = model.payloadJson;
  }
}

export type ErrorPanelModel = {
  visible: boolean;
  name: string;
  message: string;
  issues: BridgeValidationIssue[];
};

export function syncErrorPanel(rootElement: HTMLElement, model: ErrorPanelModel): void {
  const errorPanel = rootElement.querySelector('#bridge-error-panel');
  if (errorPanel instanceof HTMLElement) {
    errorPanel.hidden = !model.visible;
  }

  setText(rootElement, '#bridge-error-name', model.name);
  setText(rootElement, '#bridge-error-message', model.message);

  const errorIssues = rootElement.querySelector('#bridge-error-issues');
  if (errorIssues instanceof HTMLElement) {
    errorIssues.innerHTML = '';
    for (const issue of model.issues) {
      const item = document.createElement('li');
      item.textContent = `${issue.path} · ${issue.message}`;
      errorIssues.append(item);
    }
  }
}

export function renderTemplateButtons(
  rootElement: HTMLElement,
  templateIds: readonly TemplateId[],
  onPick: (id: TemplateId) => void,
): void {
  const container = rootElement.querySelector('#template-picker-buttons');
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.innerHTML = '';
  for (const id of templateIds) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `template-pick-${id}`;
    button.dataset.testid = `template-pick-${id}`;
    button.dataset.templateId = id;
    button.className = 'sfrb-button';
    button.textContent = id;
    button.addEventListener('click', () => onPick(id));
    container.appendChild(button);
  }
}

export function syncTemplatePicker(rootElement: HTMLElement, activeId: TemplateId): void {
  const templatePicker = rootElement.querySelector('#template-picker');
  if (templatePicker instanceof HTMLElement) {
    templatePicker.dataset.activeTemplateId = activeId;
  }

  setText(rootElement, '#template-active-label', activeId);

  const container = rootElement.querySelector('#template-picker-buttons');
  if (container instanceof HTMLElement) {
    for (const button of Array.from(container.querySelectorAll('button'))) {
      const isActive = (button as HTMLButtonElement).dataset.templateId === activeId;
      (button as HTMLButtonElement).dataset.active = String(isActive);
    }
  }
}

export function setTemplatePickerNote(rootElement: HTMLElement, note: string, errorCode: string | null = null): void {
  const templatePicker = rootElement.querySelector('#template-picker');
  if (templatePicker instanceof HTMLElement) {
    if (errorCode) {
      templatePicker.dataset.error = errorCode;
    } else {
      delete templatePicker.dataset.error;
    }
  }
  setText(rootElement, '#template-picker-note', note);
}

export type ExportPanelModel = {
  state: string;
  note: string;
};

export function syncExportPanel(rootElement: HTMLElement, model: ExportPanelModel): void {
  const exportPanel = rootElement.querySelector('#export-panel');
  if (exportPanel instanceof HTMLElement) {
    exportPanel.dataset.exportState = model.state;
  }

  setText(rootElement, '#export-state-label', model.state);
  setText(rootElement, '#export-state-note', model.note);

  const exportPreviewButton = rootElement.querySelector('#export-preview');
  if (exportPreviewButton instanceof HTMLButtonElement) {
    exportPreviewButton.disabled = model.state !== 'ready';
  }
}
