import type { ReadyBridgePayload } from '../../bridge-client';
import type { DocumentEditorEngine } from '../engine';

export type CanvasOverflowDiagnostics = {
  status: 'idle' | 'settling' | 'clear' | 'overflow';
  frameId: string | null;
  blockId: string | null;
  measuredContentHeight: number | null;
  measuredAvailableHeight: number | null;
  overflowPx: number | null;
  documentKey: string | null;
};

export type OverflowController = {
  schedule: (reason: 'render' | 'snapshot' | 'resize') => void;
  emitEmpty: () => void;
  emitSettling: (frameId: string, blockId: string) => void;
  dispose: () => void;
};

export function createEmptyOverflowDiagnostics(): CanvasOverflowDiagnostics {
  return {
    status: 'idle',
    frameId: null,
    blockId: null,
    measuredContentHeight: null,
    measuredAvailableHeight: null,
    overflowPx: null,
    documentKey: null,
  };
}

export function createDocumentKey(payload: ReadyBridgePayload | null): string | null {
  return payload ? JSON.stringify(payload.document) : null;
}

export function createOverflowController(deps: {
  engine: DocumentEditorEngine;
  getPayload: () => ReadyBridgePayload | null;
  frameElements: Map<string, HTMLElement>;
  isDragging: () => boolean;
  onChange?: (diagnostics: CanvasOverflowDiagnostics) => void;
}): OverflowController {
  const { engine, getPayload, frameElements, isDragging } = deps;
  let overflowTimer: ReturnType<typeof setTimeout> | null = null;
  let lastOverflowSignature = '';

  const emit = (diagnostics: CanvasOverflowDiagnostics) => {
    const signature = JSON.stringify(diagnostics);
    if (signature === lastOverflowSignature) {
      return;
    }
    lastOverflowSignature = signature;
    deps.onChange?.(diagnostics);
  };

  const schedule = (reason: 'render' | 'snapshot' | 'resize') => {
    if (overflowTimer) {
      clearTimeout(overflowTimer);
      overflowTimer = null;
    }

    const payload = getPayload();
    const snapshot = engine.getSnapshot();
    if (!payload || payload.physics !== 'design') {
      emit(createEmptyOverflowDiagnostics());
      return;
    }

    const selectedFrameId = snapshot.selectedFrameId;
    if (!selectedFrameId) {
      emit({
        ...createEmptyOverflowDiagnostics(),
        documentKey: createDocumentKey(payload),
      });
      return;
    }

    const selectedFrame = payload.document.layout.frames.find((frame) => frame.id === selectedFrameId);
    const documentKey = createDocumentKey(payload);
    if (!selectedFrame) {
      emit({
        status: 'idle',
        frameId: selectedFrameId,
        blockId: null,
        measuredContentHeight: null,
        measuredAvailableHeight: null,
        overflowPx: null,
        documentKey,
      });
      return;
    }

    const isEditingSelected = snapshot.editingBlockId !== null && snapshot.editingBlockId === selectedFrame.blockId;
    if (isDragging() || isEditingSelected) {
      emit({
        status: 'settling',
        frameId: selectedFrame.id,
        blockId: selectedFrame.blockId,
        measuredContentHeight: null,
        measuredAvailableHeight: null,
        overflowPx: null,
        documentKey,
      });
      return;
    }

    if (reason !== 'resize') {
      emit({
        status: 'settling',
        frameId: selectedFrame.id,
        blockId: selectedFrame.blockId,
        measuredContentHeight: null,
        measuredAvailableHeight: null,
        overflowPx: null,
        documentKey,
      });
    }

    overflowTimer = setTimeout(
      () => {
        const currentPayload = getPayload();
        const frameElement = frameElements.get(selectedFrame.id);
        const body = frameElement?.querySelector<HTMLElement>('[data-role="block-body"]') ?? null;
        if (!frameElement || !body || !currentPayload || currentPayload.physics !== 'design') {
          emit(createEmptyOverflowDiagnostics());
          return;
        }

        const measuredAvailableHeight = Math.max(0, Math.round(body.clientHeight));
        const measuredContentHeight = Math.max(0, Math.round(body.scrollHeight));
        const overflowPx = Math.max(0, measuredContentHeight - measuredAvailableHeight);
        emit({
          status: overflowPx > 0 ? 'overflow' : 'clear',
          frameId: selectedFrame.id,
          blockId: selectedFrame.blockId,
          measuredContentHeight,
          measuredAvailableHeight,
          overflowPx,
          documentKey: createDocumentKey(currentPayload),
        });
      },
      reason === 'resize' ? 120 : 220,
    );
  };

  return {
    schedule,
    emitEmpty: () => emit(createEmptyOverflowDiagnostics()),
    emitSettling: (frameId, blockId) => {
      emit({
        ...createEmptyOverflowDiagnostics(),
        status: 'settling',
        frameId,
        blockId,
        documentKey: createDocumentKey(getPayload()),
      });
    },
    dispose: () => {
      if (overflowTimer) {
        clearTimeout(overflowTimer);
        overflowTimer = null;
      }
    },
  };
}
