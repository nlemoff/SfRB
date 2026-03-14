export const BRIDGE_BOOTSTRAP_PATH = '/__sfrb/bootstrap';
export const BRIDGE_UPDATE_EVENT = 'sfrb:bridge-update';
export const BRIDGE_ERROR_EVENT = 'sfrb:bridge-error';

export type ReadyBridgePayload = {
  status: 'ready';
  workspaceRoot: string;
  documentPath: string;
  configPath: string;
  physics: string;
  document: {
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
      }>;
      frames: Array<{
        id: string;
      }>;
    };
  };
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
};

export type BridgePayload = ReadyBridgePayload | ErrorBridgePayload;

export type BridgeSignal = {
  event: typeof BRIDGE_UPDATE_EVENT | typeof BRIDGE_ERROR_EVENT;
  receivedAt: string;
  detail: Record<string, unknown>;
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
