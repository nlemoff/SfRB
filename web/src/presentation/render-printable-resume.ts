import type { ReadyBridgePayload, BridgeDocument } from '../bridge-client';

export type PrintableResumeState = {
  readonly pageCount: number;
  readonly renderSupport: 'supported' | 'unsupported';
  readonly exportState: 'ready' | 'risk' | 'blocked';
  readonly overflowStatus: 'clear' | 'risk' | 'unknown';
  readonly blockedReason: string | null;
  readonly riskCount: number;
  readonly maxOverflowPx: number;
};

type OverflowRisk = {
  readonly frameId: string;
  readonly blockId: string;
  readonly overflowPx: number;
};

type PageDef = BridgeDocument['layout']['pages'][number];
type FrameDef = BridgeDocument['layout']['frames'][number];
type BlockDef = BridgeDocument['semantic']['blocks'][number];

const SUPPORTED_PHYSICS = ['document', 'design'];

function isSupportedPhysics(physics: string): boolean {
  return SUPPORTED_PHYSICS.includes(physics);
}

// ---------------------------------------------------------------------------
// DOM element builders
// ---------------------------------------------------------------------------

function createPageElement(page: PageDef, mode: 'preview' | 'artifact'): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-testid', `print-page-${page.id}`);
  el.setAttribute('data-page-id', page.id);

  Object.assign(el.style, {
    width: `${page.size.width}px`,
    height: `${page.size.height}px`,
    position: 'relative',
    overflow: 'hidden',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    paddingTop: `${page.margin.top}px`,
    paddingRight: `${page.margin.right}px`,
    paddingBottom: `${page.margin.bottom}px`,
    paddingLeft: `${page.margin.left}px`,
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  });

  if (mode === 'preview') {
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  }

  return el;
}

function createDesignFrameElement(frame: FrameDef, block: BlockDef): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-testid', `print-frame-${frame.id}`);
  el.setAttribute('data-frame-id', frame.id);
  el.setAttribute('data-block-id', frame.blockId);

  Object.assign(el.style, {
    position: 'absolute',
    left: `${frame.box.x}px`,
    top: `${frame.box.y}px`,
    width: `${frame.box.width}px`,
    height: `${frame.box.height}px`,
    overflow: 'visible',
    boxSizing: 'border-box',
  });

  el.appendChild(createBlockTextElement(block));
  return el;
}

function createDocumentFrameElement(frame: FrameDef, block: BlockDef): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-testid', `print-frame-${frame.id}`);
  el.setAttribute('data-frame-id', frame.id);
  el.setAttribute('data-block-id', frame.blockId);

  Object.assign(el.style, {
    overflow: 'visible',
    boxSizing: 'border-box',
  });

  el.appendChild(createBlockTextElement(block));
  return el;
}

function createBlockTextElement(block: BlockDef): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-testid', `print-block-${block.id}`);
  el.setAttribute('data-block-id', block.id);
  el.setAttribute('data-block-kind', block.kind);

  const base: Partial<CSSStyleDeclaration> = {
    lineHeight: '1.5',
    marginBottom: '4px',
  };

  switch (block.kind) {
    case 'heading':
      Object.assign(el.style, { ...base, fontWeight: 'bold', fontSize: '18px', lineHeight: '1.3' });
      break;
    case 'bullet':
      Object.assign(el.style, { ...base, fontSize: '12px', paddingLeft: '12px' });
      break;
    case 'fact':
      Object.assign(el.style, { ...base, fontSize: '12px', marginBottom: '2px' });
      break;
    default:
      Object.assign(el.style, { ...base, fontSize: '12px' });
  }

  el.textContent = block.text;
  return el;
}

// ---------------------------------------------------------------------------
// Overflow measurement
// ---------------------------------------------------------------------------

function measureOverflowRisks(
  pageElements: HTMLElement[],
  doc: BridgeDocument,
  physics: string,
): OverflowRisk[] {
  const risks: OverflowRisk[] = [];

  if (physics === 'design') {
    for (const frame of doc.layout.frames) {
      const frameEl = findFrameElement(pageElements, frame.id);
      if (!frameEl) continue;

      const contentHeight = frameEl.scrollHeight;
      const availableHeight = frame.box.height;

      if (contentHeight > availableHeight + 1) {
        risks.push({
          frameId: frame.id,
          blockId: frame.blockId,
          overflowPx: Math.round(contentHeight - availableHeight),
        });
      }
    }
  }

  for (const page of doc.layout.pages) {
    const pageEl = pageElements.find(el => el.getAttribute('data-page-id') === page.id);
    if (!pageEl) continue;

    const contentArea = page.size.height - page.margin.top - page.margin.bottom;
    const actualContent = pageEl.scrollHeight - page.margin.top - page.margin.bottom;

    if (actualContent > contentArea + 1) {
      const pageFrames = doc.layout.frames.filter(f => f.pageId === page.id);
      if (pageFrames.length > 0) {
        risks.push({
          frameId: pageFrames[pageFrames.length - 1].id,
          blockId: pageFrames[pageFrames.length - 1].blockId,
          overflowPx: Math.round(actualContent - contentArea),
        });
      }
    }
  }

  return risks;
}

function findFrameElement(pageElements: HTMLElement[], frameId: string): HTMLElement | null {
  for (const pageEl of pageElements) {
    const el = pageEl.querySelector(`[data-frame-id="${frameId}"]`);
    if (el) return el as HTMLElement;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Diagnostics panel (preview mode only)
// ---------------------------------------------------------------------------

function createDiagnosticsPanel(state: PrintableResumeState): HTMLElement {
  const panel = document.createElement('div');
  panel.setAttribute('data-testid', 'print-diagnostics');

  Object.assign(panel.style, {
    padding: '12px 16px',
    margin: '0 auto 16px',
    maxWidth: '612px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
    lineHeight: '1.5',
    borderRadius: '6px',
    color: '#e2e8f0',
  });

  if (state.exportState === 'ready') {
    panel.style.backgroundColor = '#0f2b1d';
    panel.style.border = '1px solid #166534';
    panel.textContent = `Export ready \u00b7 ${state.pageCount} page${state.pageCount !== 1 ? 's' : ''}`;
  } else if (state.exportState === 'risk') {
    panel.style.backgroundColor = '#2b1f0f';
    panel.style.border = '1px solid #92400e';
    panel.textContent = `Export risk \u00b7 ${state.riskCount} overflow${state.riskCount !== 1 ? 's' : ''} \u00b7 max ${state.maxOverflowPx}px`;
  } else {
    panel.style.backgroundColor = '#2b0f0f';
    panel.style.border = '1px solid #991b1b';
    panel.textContent = `Export blocked \u00b7 ${state.blockedReason ?? 'unknown'}`;
  }

  return panel;
}

// ---------------------------------------------------------------------------
// Root diagnostics (always applied)
// ---------------------------------------------------------------------------

function applyRootDiagnostics(rootElement: HTMLElement, state: PrintableResumeState): void {
  rootElement.setAttribute('data-export-state', state.exportState);
  rootElement.setAttribute('data-overflow-status', state.overflowStatus);
  rootElement.setAttribute('data-blocked-reason', state.blockedReason ?? '');
  rootElement.setAttribute('data-risk-count', String(state.riskCount));
  rootElement.setAttribute('data-max-overflow-px', String(state.maxOverflowPx));
}

// ---------------------------------------------------------------------------
// Main render entry
// ---------------------------------------------------------------------------

export function renderPrintableResume(
  rootElement: HTMLElement,
  payload: ReadyBridgePayload,
  mode: 'preview' | 'artifact',
): PrintableResumeState {
  rootElement.innerHTML = '';

  Object.assign(rootElement.style, {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    color: '#1a1a1a',
    backgroundColor: mode === 'preview' ? '#111827' : '#ffffff',
  });

  if (!isSupportedPhysics(payload.physics)) {
    const state: PrintableResumeState = {
      pageCount: 0,
      renderSupport: 'unsupported',
      exportState: 'blocked',
      overflowStatus: 'unknown',
      blockedReason: 'unsupported-physics',
      riskCount: 0,
      maxOverflowPx: 0,
    };
    applyRootDiagnostics(rootElement, state);
    if (mode === 'preview') {
      rootElement.appendChild(createDiagnosticsPanel(state));
    }
    return state;
  }

  const doc = payload.document;
  const blockMap = new Map(doc.semantic.blocks.map(b => [b.id, b]));

  const pageStack = document.createElement('div');
  pageStack.setAttribute('data-testid', 'print-page-stack');

  Object.assign(pageStack.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  });

  if (mode === 'preview') {
    pageStack.style.gap = '24px';
    pageStack.style.padding = '24px 0';
  }

  const pageElements: HTMLElement[] = [];

  for (const page of doc.layout.pages) {
    const pageEl = createPageElement(page, mode);
    const pageFrames = [...doc.layout.frames.filter(f => f.pageId === page.id)]
      .sort((a, b) => a.zIndex - b.zIndex);

    if (payload.physics === 'design') {
      for (const frame of pageFrames) {
        const block = blockMap.get(frame.blockId);
        if (!block) continue;
        pageEl.appendChild(createDesignFrameElement(frame, block));
      }
    } else {
      for (const section of doc.semantic.sections) {
        for (const blockId of section.blockIds) {
          const block = blockMap.get(blockId);
          if (!block) continue;
          const frame = pageFrames.find(f => f.blockId === blockId);
          if (frame) {
            pageEl.appendChild(createDocumentFrameElement(frame, block));
          } else {
            pageEl.appendChild(createBlockTextElement(block));
          }
        }
      }
    }

    pageStack.appendChild(pageEl);
    pageElements.push(pageEl);
  }

  rootElement.appendChild(pageStack);

  // Measure overflow after rendering
  const risks = measureOverflowRisks(pageElements, doc, payload.physics);
  const maxOverflowPx = risks.length > 0 ? Math.max(...risks.map(r => r.overflowPx)) : 0;

  const finalState: PrintableResumeState = {
    pageCount: doc.layout.pages.length,
    renderSupport: 'supported',
    exportState: risks.length > 0 ? 'risk' : 'ready',
    overflowStatus: risks.length > 0 ? 'risk' : 'clear',
    blockedReason: null,
    riskCount: risks.length,
    maxOverflowPx,
  };

  if (mode === 'preview') {
    rootElement.insertBefore(createDiagnosticsPanel(finalState), pageStack);
  }
  applyRootDiagnostics(rootElement, finalState);

  return finalState;
}
