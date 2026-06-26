import {
  type BridgeDocument,
  type BridgeEditorStatusStore,
  type BridgeMutationResult,
  type BridgeSaveState,
  type EditorOperation,
  type ReadyBridgePayload,
  submitBridgeOperation,
} from '../bridge-client';

const DEFAULT_COMMIT_DEBOUNCE_MS = 700;

export type FrameBox = BridgeDocument['layout']['frames'][number]['box'];

export type EditorLens = 'text' | 'tile' | 'freeform';

export type DocumentEditorSnapshot = {
  selectedBlockId: string | null;
  selectedFrameId: string | null;
  /** Additional frames shift-clicked into the selection (primary excluded). */
  multiSelectedFrameIds: string[];
  editingBlockId: string | null;
  draftText: string | null;
  draftDirty: boolean;
  saveState: BridgeSaveState;
  saveError: string | null;
  interactionMode: 'document' | 'design' | 'unavailable';
  activeLens: EditorLens;
  /** Lens the user asked for while freeform changes still need reconciling. */
  pendingLensExit: EditorLens | null;
};

export type DocumentEditorEngine = {
  getSnapshot: () => DocumentEditorSnapshot;
  subscribe: (listener: (snapshot: DocumentEditorSnapshot) => void) => () => void;
  setPayload: (payload: ReadyBridgePayload | null) => void;
  setActiveLens: (lens: EditorLens) => void;
  selectBlock: (blockId: string | null) => void;
  selectFrame: (frameId: string | null) => void;
  toggleFrameInSelection: (frameId: string) => void;
  revertFrameOverrides: (frameIds: string[]) => void;
  getFreeformTouchedFrameIds: () => string[];
  clearFreeformTouched: () => void;
  resolvePendingLensExit: (outcome: 'rejoin_layout' | 'keep_locked') => Promise<BridgeMutationResult | null>;
  cancelPendingLensExit: () => void;
  startEditing: (blockId: string) => void;
  updateDraft: (text: string) => void;
  endEditing: () => void;
  scheduleCommit: () => void;
  commitActive: (reason: 'blur' | 'enter' | 'debounce') => Promise<BridgeMutationResult | null>;
  updateFrameBox: (frameId: string, box: FrameBox) => void;
  commitFrameMove: (frameId: string, reason: 'pointerup' | 'pointercancel') => Promise<BridgeMutationResult | null>;
  dispatch: (operation: EditorOperation) => Promise<BridgeMutationResult>;
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

function defaultLensForPhysics(physics: 'document' | 'design' | 'unavailable'): EditorLens {
  return physics === 'design' ? 'tile' : 'text';
}

export function createDocumentEditorEngine(options: {
  statusStore: BridgeEditorStatusStore;
  commitDebounceMs?: number;
}): DocumentEditorEngine {
  let payload: ReadyBridgePayload | null = null;
  let selectedBlockId: string | null = null;
  let selectedFrameId: string | null = null;
  const multiSelectedFrameIds = new Set<string>();
  // Frames whose geometry was committed from the freeform lens this session;
  // leaving freeform reconciles them explicitly (rejoin_layout | keep_locked).
  const freeformTouchedFrameIds = new Set<string>();
  let editingBlockId: string | null = null;
  let draftText: string | null = null;
  let draftDirty = false;
  let activeLens: EditorLens = 'text';
  let pendingLensExit: EditorLens | null = null;
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

  const buildSnapshot = (): DocumentEditorSnapshot => ({
    selectedBlockId,
    selectedFrameId,
    multiSelectedFrameIds: [...multiSelectedFrameIds],
    editingBlockId,
    draftText,
    draftDirty,
    saveState,
    saveError,
    interactionMode: getInteractionMode(),
    activeLens,
    pendingLensExit,
  });

  const emit = () => {
    const snapshot = buildSnapshot();
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

  // Dirty state is always compared against the canonical payload (never local
  // overrides) and emitted as structured operations: the engine cannot fork
  // the mutation model the CLI uses.
  const composePendingOperations = (): EditorOperation[] => {
    if (!payload) {
      return [];
    }

    const operations: EditorOperation[] = [];

    for (const [blockId, text] of displayTextOverrides.entries()) {
      if (blockId !== editingBlockId && getCanonicalBlockText(payload, blockId) !== text) {
        operations.push({ op: 'set-block-text', blockId, text });
      }
    }

    if (editingBlockId && draftText !== null && draftDirty) {
      operations.push({ op: 'set-block-text', blockId: editingBlockId, text: draftText });
    }

    for (const [frameId, box] of frameBoxOverrides.entries()) {
      if (!frameBoxesEqual(getCanonicalFrameBox(payload, frameId), box)) {
        if (activeLens === 'freeform') {
          operations.push({ op: 'set-frame-box', frameId, box: cloneFrameBox(box), asFreeform: true });
        } else {
          operations.push({ op: 'set-frame-box', frameId, box: cloneFrameBox(box) });
        }
      }
    }

    return operations;
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

    const operations = composePendingOperations();
    if (operations.length === 0) {
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

    inFlightCommit = (async (): Promise<BridgeMutationResult | null> => {
      let lastResult: BridgeMutationResult | null = null;
      for (const operation of operations) {
        lastResult = await submitBridgeOperation(operation, { statusStore: options.statusStore });
        if (!lastResult.ok) {
          break;
        }
      }

      if (lastResult?.ok) {
        if (activeEditingBlockId && activeDraftText !== null) {
          displayTextOverrides.set(activeEditingBlockId, activeDraftText);
          if (editingBlockId === activeEditingBlockId && draftText === activeDraftText) {
            draftDirty = false;
          }
        }

        for (const [frameId, box] of pendingFrameBoxes.entries()) {
          frameBoxOverrides.set(frameId, cloneFrameBox(box));
        }

        for (const operation of operations) {
          if (operation.op === 'set-frame-box' && operation.asFreeform === true) {
            freeformTouchedFrameIds.add(operation.frameId);
          }
        }
      }
      return lastResult;
    })().finally(() => {
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
    getSnapshot: buildSnapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setPayload: (nextPayload) => {
      const previousPhysics = payload?.physics ?? 'unavailable';
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
        freeformTouchedFrameIds.clear();
      }

      const nextPhysics = payload?.physics ?? 'unavailable';
      if (nextPhysics !== previousPhysics || (nextPhysics !== 'design' && activeLens !== 'text')) {
        activeLens = defaultLensForPhysics(nextPhysics);
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
        multiSelectedFrameIds.clear();
      }

      for (const frameId of multiSelectedFrameIds) {
        if (!getBaseFrameBox(frameId)) {
          multiSelectedFrameIds.delete(frameId);
        }
      }

      emit();
    },
    setActiveLens: (lens) => {
      if (lens === activeLens) {
        return;
      }

      if (lens !== 'text' && payload?.physics !== 'design') {
        return;
      }

      if (editingBlockId) {
        void commitWorkingDocument();
        editingBlockId = null;
        draftText = null;
        draftDirty = false;
      }

      // Leaving freeform with session placements is an explicit decision:
      // pause the switch until the user reconciles or cancels.
      const liveTouched = [...freeformTouchedFrameIds].filter(
        (frameId) => getCanonicalFrameBox(payload, frameId) !== null,
      );
      if (activeLens === 'freeform' && liveTouched.length > 0) {
        pendingLensExit = lens;
        emit();
        return;
      }

      freeformTouchedFrameIds.clear();
      activeLens = lens;
      if (lens === 'text') {
        selectedFrameId = null;
      }
      multiSelectedFrameIds.clear();
      emit();
    },
    resolvePendingLensExit: async (outcome) => {
      if (pendingLensExit === null) {
        return null;
      }

      const targetLens = pendingLensExit;
      const frameIds = [...freeformTouchedFrameIds].filter(
        (frameId) => getCanonicalFrameBox(payload, frameId) !== null,
      );

      if (frameIds.length > 0) {
        const result = await submitBridgeOperation(
          { op: 'reconcile-freeform', outcome, frameIds },
          { statusStore: options.statusStore },
        );
        if (!result.ok) {
          emit();
          return result;
        }

        freeformTouchedFrameIds.clear();
        pendingLensExit = null;
        activeLens = targetLens;
        if (targetLens === 'text') {
          selectedFrameId = null;
        }
        multiSelectedFrameIds.clear();
        emit();
        return result;
      }

      freeformTouchedFrameIds.clear();
      pendingLensExit = null;
      activeLens = targetLens;
      if (targetLens === 'text') {
        selectedFrameId = null;
      }
      multiSelectedFrameIds.clear();
      emit();
      return null;
    },
    cancelPendingLensExit: () => {
      if (pendingLensExit === null) {
        return;
      }
      pendingLensExit = null;
      emit();
    },
    selectBlock: (blockId) => {
      selectedBlockId = blockId;
      if (payload?.physics !== 'design' || activeLens === 'text' || blockId === null) {
        selectedFrameId = null;
      }
      emit();
    },
    selectFrame: (frameId) => {
      selectedFrameId = frameId;
      selectedBlockId = frameId ? getFrameBlockId(payload, frameId) : null;
      multiSelectedFrameIds.clear();
      emit();
    },
    toggleFrameInSelection: (frameId) => {
      if (payload?.physics !== 'design' || activeLens === 'text') {
        return;
      }

      if (!selectedFrameId) {
        selectedFrameId = frameId;
        selectedBlockId = getFrameBlockId(payload, frameId);
        emit();
        return;
      }

      if (frameId === selectedFrameId) {
        emit();
        return;
      }

      if (multiSelectedFrameIds.has(frameId)) {
        multiSelectedFrameIds.delete(frameId);
      } else {
        multiSelectedFrameIds.add(frameId);
      }
      emit();
    },
    revertFrameOverrides: (frameIds) => {
      for (const frameId of frameIds) {
        frameBoxOverrides.delete(frameId);
      }
      emit();
    },
    getFreeformTouchedFrameIds: () => [...freeformTouchedFrameIds],
    clearFreeformTouched: () => {
      freeformTouchedFrameIds.clear();
    },
    startEditing: (blockId) => {
      selectedBlockId = blockId;
      if (payload?.physics === 'design' && activeLens !== 'text') {
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
    dispatch: (operation) => {
      return submitBridgeOperation(operation, { statusStore: options.statusStore });
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
      freeformTouchedFrameIds.clear();
    },
  };
}
