import {
  type BridgeDocument,
  type BridgeEditorStatusStore,
  type BridgeMutationResult,
  type BridgeSaveState,
  type ReadyBridgePayload,
  submitBridgeDocumentMutation,
} from '../bridge-client';

const DEFAULT_COMMIT_DEBOUNCE_MS = 700;

type FrameBox = BridgeDocument['layout']['frames'][number]['box'];

export type DocumentEditorSnapshot = {
  selectedBlockId: string | null;
  selectedFrameId: string | null;
  editingBlockId: string | null;
  draftText: string | null;
  draftDirty: boolean;
  saveState: BridgeSaveState;
  saveError: string | null;
  interactionMode: 'document' | 'design' | 'unavailable';
};

export type DocumentEditorEngine = {
  getSnapshot: () => DocumentEditorSnapshot;
  subscribe: (listener: (snapshot: DocumentEditorSnapshot) => void) => () => void;
  setPayload: (payload: ReadyBridgePayload | null) => void;
  selectBlock: (blockId: string | null) => void;
  selectFrame: (frameId: string | null) => void;
  startEditing: (blockId: string) => void;
  updateDraft: (text: string) => void;
  endEditing: () => void;
  scheduleCommit: () => void;
  commitActive: (reason: 'blur' | 'enter' | 'debounce') => Promise<BridgeMutationResult | null>;
  updateFrameBox: (frameId: string, box: FrameBox) => void;
  commitFrameMove: (frameId: string, reason: 'pointerup' | 'pointercancel') => Promise<BridgeMutationResult | null>;
  getPayload: () => ReadyBridgePayload | null;
  getBlockText: (blockId: string) => string | null;
  getDisplayText: (blockId: string) => string | null;
  getFrameBox: (frameId: string) => FrameBox | null;
  getCommitDebounceMs: () => number;
  destroy: () => void;
};

function cloneFrameBox(box: FrameBox): FrameBox {
  return { ...box };
}

function frameBoxesEqual(left: FrameBox | null, right: FrameBox | null): boolean {
  if (!left || !right) {
    return left === right;
  }

  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}

function replaceBlockText(document: BridgeDocument, blockId: string, text: string): BridgeDocument {
  return {
    ...document,
    semantic: {
      ...document.semantic,
      blocks: document.semantic.blocks.map((block) => (block.id === blockId ? { ...block, text } : block)),
    },
  };
}

function replaceFrameBox(document: BridgeDocument, frameId: string, box: FrameBox): BridgeDocument {
  return {
    ...document,
    layout: {
      ...document.layout,
      frames: document.layout.frames.map((frame) => (frame.id === frameId ? { ...frame, box: cloneFrameBox(box) } : frame)),
    },
  };
}

function getCanonicalBlockText(payload: ReadyBridgePayload | null, blockId: string): string | null {
  if (!payload) {
    return null;
  }

  const block = payload.document.semantic.blocks.find((entry) => entry.id === blockId);
  return block?.text ?? null;
}

function getCanonicalFrameBox(payload: ReadyBridgePayload | null, frameId: string): FrameBox | null {
  if (!payload) {
    return null;
  }

  const frame = payload.document.layout.frames.find((entry) => entry.id === frameId);
  return frame ? cloneFrameBox(frame.box) : null;
}

function getFrameBlockId(payload: ReadyBridgePayload | null, frameId: string): string | null {
  if (!payload) {
    return null;
  }

  const frame = payload.document.layout.frames.find((entry) => entry.id === frameId);
  return frame?.blockId ?? null;
}

export function createDocumentEditorEngine(options: {
  statusStore: BridgeEditorStatusStore;
  commitDebounceMs?: number;
}): DocumentEditorEngine {
  let payload: ReadyBridgePayload | null = null;
  let selectedBlockId: string | null = null;
  let selectedFrameId: string | null = null;
  let editingBlockId: string | null = null;
  let draftText: string | null = null;
  let draftDirty = false;
  let saveState: BridgeSaveState = options.statusStore.getSnapshot().saveState;
  let saveError: string | null = options.statusStore.getSnapshot().errorMessage;
  const displayTextOverrides = new Map<string, string>();
  const frameBoxOverrides = new Map<string, FrameBox>();
  const listeners = new Set<(snapshot: DocumentEditorSnapshot) => void>();
  const commitDebounceMs = options.commitDebounceMs ?? DEFAULT_COMMIT_DEBOUNCE_MS;
  let commitTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlightCommit: Promise<BridgeMutationResult | null> | null = null;
  let queuedCommit = false;

  const getInteractionMode = (): DocumentEditorSnapshot['interactionMode'] => payload?.physics ?? 'unavailable';

  const emit = () => {
    const snapshot: DocumentEditorSnapshot = {
      selectedBlockId,
      selectedFrameId,
      editingBlockId,
      draftText,
      draftDirty,
      saveState,
      saveError,
      interactionMode: getInteractionMode(),
    };
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const clearCommitTimer = () => {
    if (commitTimer) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
  };

  const getBaseText = (blockId: string): string | null => {
    return displayTextOverrides.get(blockId) ?? getCanonicalBlockText(payload, blockId);
  };

  const getBaseFrameBox = (frameId: string): FrameBox | null => {
    const override = frameBoxOverrides.get(frameId);
    return override ? cloneFrameBox(override) : getCanonicalFrameBox(payload, frameId);
  };

  const composeWorkingDocument = (): BridgeDocument | null => {
    if (!payload) {
      return null;
    }

    let nextDocument: BridgeDocument = payload.document;

    for (const [blockId, text] of displayTextOverrides.entries()) {
      if (getCanonicalBlockText(payload, blockId) !== text) {
        nextDocument = replaceBlockText(nextDocument, blockId, text);
      }
    }

    if (editingBlockId && draftText !== null && draftDirty) {
      nextDocument = replaceBlockText(nextDocument, editingBlockId, draftText);
    }

    for (const [frameId, box] of frameBoxOverrides.entries()) {
      if (!frameBoxesEqual(getCanonicalFrameBox(payload, frameId), box)) {
        nextDocument = replaceFrameBox(nextDocument, frameId, box);
      }
    }

    return nextDocument;
  };

  const statusUnsubscribe = options.statusStore.subscribe((snapshot) => {
    saveState = snapshot.saveState;
    saveError = snapshot.errorMessage;
    emit();
  });

  const commitWorkingDocument = async (): Promise<BridgeMutationResult | null> => {
    clearCommitTimer();
    if (!payload) {
      return null;
    }

    const nextDocument = composeWorkingDocument();
    if (!nextDocument) {
      return null;
    }

    const hasDirtyDraft = Boolean(editingBlockId && draftDirty && draftText !== null);
    const hasFrameOverride = Array.from(frameBoxOverrides.entries()).some(([frameId, box]) => {
      return !frameBoxesEqual(getCanonicalFrameBox(payload, frameId), box);
    });
    const hasTextOverride = Array.from(displayTextOverrides.entries()).some(([blockId, text]) => {
      return getCanonicalBlockText(payload, blockId) !== text;
    });

    if (!hasDirtyDraft && !hasFrameOverride && !hasTextOverride) {
      draftDirty = false;
      emit();
      return null;
    }

    if (inFlightCommit) {
      queuedCommit = true;
      return inFlightCommit;
    }

    const activeEditingBlockId = editingBlockId;
    const activeDraftText = draftText;
    const pendingFrameBoxes = new Map(frameBoxOverrides.entries());

    inFlightCommit = submitBridgeDocumentMutation(nextDocument, {
      statusStore: options.statusStore,
    })
      .then((result) => {
        if (result.ok) {
          if (activeEditingBlockId && activeDraftText !== null) {
            displayTextOverrides.set(activeEditingBlockId, activeDraftText);
            if (editingBlockId === activeEditingBlockId && draftText === activeDraftText) {
              draftDirty = false;
            }
          }

          for (const [frameId, box] of pendingFrameBoxes.entries()) {
            frameBoxOverrides.set(frameId, cloneFrameBox(box));
          }
        }
        return result;
      })
      .finally(() => {
        inFlightCommit = null;
        if (queuedCommit) {
          queuedCommit = false;
          void commitWorkingDocument();
        } else {
          emit();
        }
      });

    return inFlightCommit;
  };

  return {
    getSnapshot: () => ({
      selectedBlockId,
      selectedFrameId,
      editingBlockId,
      draftText,
      draftDirty,
      saveState,
      saveError,
      interactionMode: getInteractionMode(),
    }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setPayload: (nextPayload) => {
      payload = nextPayload;
      if (payload) {
        for (const [blockId, overrideText] of displayTextOverrides.entries()) {
          if (getCanonicalBlockText(payload, blockId) === overrideText) {
            displayTextOverrides.delete(blockId);
          }
        }

        for (const [frameId, overrideBox] of frameBoxOverrides.entries()) {
          if (frameBoxesEqual(getCanonicalFrameBox(payload, frameId), overrideBox)) {
            frameBoxOverrides.delete(frameId);
          }
        }
      } else {
        displayTextOverrides.clear();
        frameBoxOverrides.clear();
      }

      if (editingBlockId && !draftDirty) {
        draftText = getBaseText(editingBlockId);
      }

      if (selectedBlockId && !getBaseText(selectedBlockId) && !editingBlockId) {
        selectedBlockId = null;
      }

      if (selectedFrameId && !getBaseFrameBox(selectedFrameId)) {
        selectedFrameId = null;
      }

      if (payload?.physics !== 'design') {
        selectedFrameId = null;
      }

      emit();
    },
    selectBlock: (blockId) => {
      selectedBlockId = blockId;
      if (payload?.physics !== 'design' || blockId === null) {
        selectedFrameId = null;
      }
      emit();
    },
    selectFrame: (frameId) => {
      selectedFrameId = frameId;
      selectedBlockId = frameId ? getFrameBlockId(payload, frameId) : null;
      emit();
    },
    startEditing: (blockId) => {
      selectedBlockId = blockId;
      if (payload?.physics === 'design') {
        const linkedFrame = payload.document.layout.frames.find((frame) => frame.blockId === blockId);
        selectedFrameId = linkedFrame?.id ?? selectedFrameId;
      }
      editingBlockId = blockId;
      draftText = getBaseText(blockId) ?? '';
      draftDirty = false;
      emit();
    },
    updateDraft: (text) => {
      if (!editingBlockId) {
        return;
      }

      draftText = text;
      draftDirty = text !== (getBaseText(editingBlockId) ?? '');
      emit();
    },
    endEditing: () => {
      clearCommitTimer();
      editingBlockId = null;
      draftText = null;
      draftDirty = false;
      emit();
    },
    scheduleCommit: () => {
      clearCommitTimer();
      if (!editingBlockId) {
        return;
      }

      commitTimer = setTimeout(() => {
        void commitWorkingDocument();
      }, commitDebounceMs);
    },
    commitActive: (reason) => {
      void reason;
      return commitWorkingDocument();
    },
    updateFrameBox: (frameId, box) => {
      frameBoxOverrides.set(frameId, cloneFrameBox(box));
      if (payload?.physics === 'design') {
        selectedFrameId = frameId;
        selectedBlockId = getFrameBlockId(payload, frameId);
      }
      emit();
    },
    commitFrameMove: (frameId, reason) => {
      void frameId;
      void reason;
      return commitWorkingDocument();
    },
    getPayload: () => payload,
    getBlockText: (blockId) => getCanonicalBlockText(payload, blockId),
    getDisplayText: (blockId) => {
      if (editingBlockId === blockId) {
        return draftText;
      }
      return getBaseText(blockId);
    },
    getFrameBox: (frameId) => getBaseFrameBox(frameId),
    getCommitDebounceMs: () => commitDebounceMs,
    destroy: () => {
      clearCommitTimer();
      statusUnsubscribe();
      listeners.clear();
      displayTextOverrides.clear();
      frameBoxOverrides.clear();
    },
  };
}
