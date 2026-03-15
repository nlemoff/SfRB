export const BRIDGE_BOOTSTRAP_PATH = '/__sfrb/bootstrap';
export const BRIDGE_EDITOR_MUTATION_PATH = '/__sfrb/editor';
export const BRIDGE_LAYOUT_CONSULTANT_PATH = '/__sfrb/consultant';
export const BRIDGE_UPDATE_EVENT = 'sfrb:bridge-update';
export const BRIDGE_ERROR_EVENT = 'sfrb:bridge-error';

export type BridgeValidationIssue = {
  path: string;
  message: string;
};

export type BridgeDocument = {
  version: number;
  metadata: {
    title: string;
    locale: string;
  };
  semantic: {
    sections: Array<{
      id: string;
      title: string;
      blockIds: string[];
    }>;
    blocks: Array<{
      id: string;
      kind: string;
      text: string;
    }>;
  };
  layout: {
    pages: Array<{
      id: string;
      size: {
        width: number;
        height: number;
      };
      margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
      };
    }>;
    frames: Array<{
      id: string;
      pageId: string;
      blockId: string;
      box: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      zIndex: number;
    }>;
  };
};

export type ReadyBridgePayload = {
  status: 'ready';
  workspaceRoot: string;
  documentPath: string;
  configPath: string;
  physics: string;
  document: BridgeDocument;
};

export type ErrorBridgePayload = {
  status: 'error';
  workspaceRoot: string;
  message: string;
  name: string;
  documentPath: string;
  configPath: string;
  changedPath?: string;
  changedPaths?: string[];
  watchedPath?: string;
  issues?: BridgeValidationIssue[];
};

export type BridgePayload = ReadyBridgePayload | ErrorBridgePayload;

export type BridgeSignal = {
  event: typeof BRIDGE_UPDATE_EVENT | typeof BRIDGE_ERROR_EVENT;
  receivedAt: string;
  detail: Record<string, unknown>;
};

export type BridgeSaveState = 'idle' | 'saving' | 'error';

export type BridgeMutationSuccess = {
  ok: true;
  status: 'saved';
  saveState: 'idle';
  workspaceRoot: string;
  documentPath: string;
  configPath: string;
  physics: string;
  canonicalBootstrapPath: typeof BRIDGE_BOOTSTRAP_PATH;
  savedAt: string;
};

export type BridgeMutationError = {
  ok: false;
  status: 'error';
  saveState: 'error';
  code: 'request_invalid' | 'document_invalid' | 'physics_invalid' | 'persistence_failed';
  workspaceRoot: string;
  message: string;
  name: string;
  documentPath: string;
  configPath: string;
  canonicalBootstrapPath: typeof BRIDGE_BOOTSTRAP_PATH;
  issues?: BridgeValidationIssue[];
  cause?: string;
};

export type BridgeMutationResult = BridgeMutationSuccess | BridgeMutationError;

export type LayoutConsultantRequest = {
  frameId: string;
  issue: {
    kind: 'overflow';
    measuredContentHeight: number;
    measuredAvailableHeight: number;
  };
};

export type LayoutConsultantProposal = {
  kind: 'frame_resize';
  frameId: string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rationale: string;
  confidence: number;
};

export type BridgeConsultantSuccess = {
  ok: true;
  status: 'proposal';
  code: 'proposal_ready';
  workspaceRoot: string;
  documentPath: string;
  configPath: string;
  canonicalBootstrapPath: typeof BRIDGE_BOOTSTRAP_PATH;
  provider: string;
  apiKeyEnvVar: string;
  proposal: LayoutConsultantProposal;
};

export type BridgeConsultantError = {
  ok: false;
  status: 'error' | 'unavailable';
  code:
    | 'request_invalid'
    | 'configuration_missing'
    | 'provider_unsupported'
    | 'provider_unavailable'
    | 'malformed_provider_output'
    | 'proposal_rejected'
    | 'frame_not_found';
  workspaceRoot: string;
  message: string;
  name: string;
  documentPath: string;
  configPath: string;
  canonicalBootstrapPath: typeof BRIDGE_BOOTSTRAP_PATH;
  provider?: string;
  apiKeyEnvVar?: string;
  issues?: BridgeValidationIssue[];
};

export type BridgeConsultantResult = BridgeConsultantSuccess | BridgeConsultantError;

export type BridgeEditorStatusSnapshot = {
  saveState: BridgeSaveState;
  lastResult: BridgeMutationResult | null;
  errorMessage: string | null;
};

export type BridgeEditorStatusStore = {
  getSnapshot: () => BridgeEditorStatusSnapshot;
  subscribe: (listener: (snapshot: BridgeEditorStatusSnapshot) => void) => () => void;
  markSaving: () => void;
  settle: (result: BridgeMutationResult) => void;
};

export async function fetchBridgePayload(signal?: AbortSignal): Promise<BridgePayload> {
  const response = await fetch(BRIDGE_BOOTSTRAP_PATH, {
    headers: {
      accept: 'application/json',
    },
    signal,
  });

  const payload = (await response.json()) as BridgePayload;
  return payload;
}

export async function submitBridgeDocumentMutation(
  document: BridgeDocument,
  options: {
    signal?: AbortSignal;
    statusStore?: BridgeEditorStatusStore;
  } = {},
): Promise<BridgeMutationResult> {
  options.statusStore?.markSaving();

  const response = await fetch(BRIDGE_EDITOR_MUTATION_PATH, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ document }),
    signal: options.signal,
  });

  const result = (await response.json()) as BridgeMutationResult;
  options.statusStore?.settle(result);
  return result;
}

export async function requestBridgeLayoutConsultant(
  request: LayoutConsultantRequest,
  options: {
    signal?: AbortSignal;
  } = {},
): Promise<BridgeConsultantResult> {
  const response = await fetch(BRIDGE_LAYOUT_CONSULTANT_PATH, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: options.signal,
  });

  return (await response.json()) as BridgeConsultantResult;
}

export function createBridgeEditorStatusStore(
  initialSnapshot: Partial<BridgeEditorStatusSnapshot> = {},
): BridgeEditorStatusStore {
  let snapshot: BridgeEditorStatusSnapshot = {
    saveState: initialSnapshot.saveState ?? 'idle',
    lastResult: initialSnapshot.lastResult ?? null,
    errorMessage: initialSnapshot.errorMessage ?? null,
  };
  const listeners = new Set<(next: BridgeEditorStatusSnapshot) => void>();

  const emit = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    markSaving: () => {
      snapshot = {
        ...snapshot,
        saveState: 'saving',
        errorMessage: null,
      };
      emit();
    },
    settle: (result) => {
      snapshot = {
        saveState: result.saveState,
        lastResult: result,
        errorMessage: result.ok ? null : result.message,
      };
      emit();
    },
  };
}

export function subscribeToBridgeSignals(onSignal: (signal: BridgeSignal) => void): () => void {
  const hot = import.meta.hot;
  if (!hot) {
    return () => {};
  }

  const onUpdate = (detail: Record<string, unknown>) => {
    onSignal({
      event: BRIDGE_UPDATE_EVENT,
      receivedAt: new Date().toISOString(),
      detail,
    });
  };

  const onError = (detail: Record<string, unknown>) => {
    onSignal({
      event: BRIDGE_ERROR_EVENT,
      receivedAt: new Date().toISOString(),
      detail,
    });
  };

  hot.on(BRIDGE_UPDATE_EVENT, onUpdate);
  hot.on(BRIDGE_ERROR_EVENT, onError);

  return () => {
    hot.off(BRIDGE_UPDATE_EVENT, onUpdate);
    hot.off(BRIDGE_ERROR_EVENT, onError);
  };
}
