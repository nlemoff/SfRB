import {
  type BridgePayload,
  type BridgeSignal,
  BRIDGE_BOOTSTRAP_PATH,
  fetchBridgePayload,
  subscribeToBridgeSignals,
} from './bridge-client';

const pageStyles = [
  'min-height: 100vh',
  'margin: 0',
  'background: radial-gradient(circle at top, rgba(71, 141, 255, 0.2), transparent 32%), linear-gradient(180deg, #081120 0%, #05070d 100%)',
  'color: #f6f7fb',
  'font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif',
].join('; ');

const shellStyles = ['max-width: 1120px', 'margin: 0 auto', 'padding: 48px 24px 80px'].join('; ');
const panelStyles = [
  'background: rgba(7, 12, 24, 0.74)',
  'border: 1px solid rgba(148, 163, 184, 0.24)',
  'border-radius: 24px',
  'box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35)',
  'backdrop-filter: blur(20px)',
].join('; ');

type AppState = {
  payload: BridgePayload | null;
  lastSignal: BridgeSignal | null;
  fetchError: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

function renderReadyState(state: AppState): string {
  const readyPayload = state.payload?.status === 'ready' ? state.payload : null;
  if (!readyPayload) {
    return '';
  }

  const blocksById = new Map(readyPayload.document.semantic.blocks.map((block) => [block.id, block]));
  const sectionsHtml = readyPayload.document.semantic.sections
    .map((section) => {
      const blocksHtml = section.blockIds
        .map((blockId) => {
          const block = blocksById.get(blockId);
          return `
            <article style="padding: 14px 16px; border-radius: 16px; background: rgba(15, 23, 42, 0.7)">
              <div style="color: #a5b4fc; font-size: 0.74rem; letter-spacing: 0.14em; text-transform: uppercase;">
                ${escapeHtml(block?.kind ?? 'missing')} · ${escapeHtml(blockId)}
              </div>
              <div style="margin-top: 8px; color: #f8fafc; line-height: 1.55;">
                ${escapeHtml(block?.text ?? 'Missing block')}
              </div>
            </article>
          `;
        })
        .join('');

      return `
        <section style="border-top: 1px solid rgba(148, 163, 184, 0.18); padding-top: 18px;">
          <h3 style="margin: 0 0 10px; font-size: 1.15rem; color: #fde68a;">${escapeHtml(section.title)}</h3>
          <div style="display: grid; gap: 10px;">${blocksHtml}</div>
        </section>
      `;
    })
    .join('');

  return `
    <section style="display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 24px; align-items: start;">
      <article style="${panelStyles}; padding: 30px;">
        <div style="display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
          <div>
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Current document</div>
            <h2 id="document-title" data-testid="document-title" style="margin: 14px 0 4px; font-size: 2.4rem;">${escapeHtml(readyPayload.document.metadata.title)}</h2>
            <div style="color: #cbd5e1;">Locale: ${escapeHtml(readyPayload.document.metadata.locale)}</div>
          </div>
          <div style="display: grid; gap: 12px; min-width: 220px;">
            <div><strong>${readyPayload.document.semantic.sections.length}</strong> sections</div>
            <div><strong>${readyPayload.document.semantic.blocks.length}</strong> blocks</div>
            <div><strong>${readyPayload.document.layout.pages.length}</strong> pages · <strong>${readyPayload.document.layout.frames.length}</strong> frames</div>
          </div>
        </div>

        <div style="margin-top: 28px; display: grid; gap: 16px;">${sectionsHtml}</div>
      </article>

      <article style="${panelStyles}; padding: 30px;">
        <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Canonical payload preview</div>
        <pre id="bridge-payload-preview" data-testid="bridge-payload-preview" style="margin-top: 16px; padding: 18px; border-radius: 18px; background: rgba(2, 6, 23, 0.88); overflow: auto; font-size: 0.82rem; line-height: 1.5; color: #bfdbfe;">${escapeHtml(JSON.stringify(readyPayload, null, 2))}</pre>
      </article>
    </section>
  `;
}

function renderErrorState(state: AppState): string {
  const errorPayload = state.payload?.status === 'error' ? state.payload : null;

  return `
    <section id="bridge-error-panel" data-testid="bridge-error-panel" style="${panelStyles}; padding: 30px; border-color: rgba(248, 113, 113, 0.5);">
      <div style="color: #fca5a5; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Invalid workspace state</div>
      <h2 style="margin: 14px 0 10px; font-size: 2rem;">${escapeHtml(state.fetchError ? 'The browser shell could not fetch bridge state.' : (errorPayload?.name ?? 'Waiting for payload'))}</h2>
      <p id="bridge-error-message" data-testid="bridge-error-message" style="color: #fee2e2; line-height: 1.6;">${escapeHtml(state.fetchError ?? errorPayload?.message ?? 'Fetching bridge payload…')}</p>
      <dl style="display: grid; grid-template-columns: minmax(160px, 220px) 1fr; gap: 12px 16px; margin-top: 20px;">
        <dt style="color: #fca5a5;">Document path</dt>
        <dd id="bridge-error-document-path" data-testid="bridge-error-document-path" style="margin: 0; word-break: break-word;">${escapeHtml(errorPayload?.documentPath ?? 'Unavailable')}</dd>
        <dt style="color: #fca5a5;">Config path</dt>
        <dd id="bridge-error-config-path" data-testid="bridge-error-config-path" style="margin: 0; word-break: break-word;">${escapeHtml(errorPayload?.configPath ?? 'Unavailable')}</dd>
        <dt style="color: #fca5a5;">Changed path</dt>
        <dd id="bridge-error-changed-path" data-testid="bridge-error-changed-path" style="margin: 0; word-break: break-word;">${escapeHtml(errorPayload?.changedPath ?? errorPayload?.watchedPath ?? 'None recorded yet')}</dd>
      </dl>
      <pre id="bridge-error-json" data-testid="bridge-error-json" style="margin-top: 20px; padding: 18px; border-radius: 18px; background: rgba(40, 8, 12, 0.92); overflow: auto; font-size: 0.82rem; line-height: 1.5; color: #fecaca;">${escapeHtml(JSON.stringify(errorPayload ?? { status: 'loading', fetchError: state.fetchError }, null, 2))}</pre>
    </section>
  `;
}

function renderMarkup(state: AppState): string {
  const payloadStatus = state.payload?.status ?? (state.fetchError ? 'fetch-error' : 'loading');
  const bridgeStatusLabel = state.fetchError ? 'Fetch failed' : (state.payload ? state.payload.status : 'Loading');
  const physicsMode = state.payload?.status === 'ready' ? state.payload.physics : 'Unavailable';
  const mainPanel = state.payload?.status === 'ready' ? renderReadyState(state) : renderErrorState(state);

  return `
    <main style="${pageStyles}">
      <div style="${shellStyles}">
        <section style="${panelStyles}; padding: 32px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
            <div>
              <p style="margin: 0; letter-spacing: 0.22em; text-transform: uppercase; color: #93c5fd; font-size: 0.76rem;">SfRB local web bridge</p>
              <h1 style="margin: 12px 0 8px; font-size: clamp(2.4rem, 6vw, 4.5rem); line-height: 0.94;">Canonical workspace state, live.</h1>
              <p style="margin: 0; max-width: 58ch; color: #cbd5e1; font-size: 1.02rem; line-height: 1.6;">
                The browser shell renders the same validated workspace document the CLI reads, then refetches canonical state whenever the bridge emits an update or error signal.
              </p>
            </div>
            <div style="min-width: 280px; flex: 1 1 320px;">
              <div id="bridge-status" data-testid="bridge-status" data-status="${escapeHtml(payloadStatus)}" style="border-radius: 18px; padding: 18px 20px; background: ${state.payload?.status === 'error' || state.fetchError ? 'rgba(127, 29, 29, 0.46)' : 'rgba(15, 118, 110, 0.28)'}; border: ${state.payload?.status === 'error' || state.fetchError ? '1px solid rgba(248, 113, 113, 0.55)' : '1px solid rgba(45, 212, 191, 0.45)'};">
                <div style="font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; color: #cbd5e1;">Bridge status</div>
                <div style="margin-top: 10px; font-size: 1.35rem; font-weight: 700;">${escapeHtml(bridgeStatusLabel)}</div>
                <div id="bridge-last-signal" data-testid="bridge-last-signal" style="margin-top: 8px; color: #dbeafe;">${escapeHtml(formatSignalLabel(state.lastSignal))}</div>
              </div>
            </div>
          </div>
        </section>

        <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 24px;">
          <article style="${panelStyles}; padding: 22px;">
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Workspace root</div>
            <div id="workspace-root" data-testid="workspace-root" style="margin-top: 12px; word-break: break-word; line-height: 1.5;">${escapeHtml(state.payload?.workspaceRoot ?? 'Loading workspace root…')}</div>
          </article>
          <article style="${panelStyles}; padding: 22px;">
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Physics mode</div>
            <div id="physics-mode" data-testid="physics-mode" style="margin-top: 12px; font-size: 1.9rem;">${escapeHtml(physicsMode)}</div>
          </article>
          <article style="${panelStyles}; padding: 22px;">
            <div style="color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;">Bootstrap endpoint</div>
            <a href="${BRIDGE_BOOTSTRAP_PATH}" style="display: inline-block; margin-top: 12px; color: #f9a8d4;">${escapeHtml(BRIDGE_BOOTSTRAP_PATH)}</a>
          </article>
        </section>

        ${mainPanel}
      </div>
    </main>
  `;
}

export function mountApp(rootElement: HTMLElement) {
  let state: AppState = {
    payload: null,
    lastSignal: null,
    fetchError: null,
  };

  const render = () => {
    rootElement.innerHTML = renderMarkup(state);
  };

  const refreshBridge = async (signal?: AbortSignal) => {
    try {
      const nextPayload = await fetchBridgePayload(signal);
      state = {
        ...state,
        payload: nextPayload,
        fetchError: null,
      };
    } catch (error) {
      state = {
        ...state,
        fetchError: error instanceof Error ? error.message : String(error),
      };
    }
    render();
  };

  render();

  const abortController = new AbortController();
  void refreshBridge(abortController.signal);

  const unsubscribe = subscribeToBridgeSignals((signal) => {
    state = {
      ...state,
      lastSignal: signal,
    };
    render();
    void refreshBridge();
  });

  return () => {
    abortController.abort();
    unsubscribe();
  };
}
