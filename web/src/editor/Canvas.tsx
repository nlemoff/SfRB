import type { ReadyBridgePayload } from '../bridge-client';
import type { DocumentEditorEngine, DocumentEditorSnapshot } from './engine';

const canvasShellStyles = [
  'display: grid',
  'gap: 18px',
].join('; ');

const canvasStatusStyles = [
  'display: grid',
  'grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))',
  'gap: 16px',
  'padding: 18px 20px',
  'border-radius: 18px',
  'background: rgba(15, 23, 42, 0.55)',
  'border: 1px solid rgba(148, 163, 184, 0.18)',
].join('; ');

const pageStyles = [
  'padding: 28px',
  'border-radius: 24px',
  'background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96))',
  'color: #0f172a',
  'box-shadow: 0 30px 80px rgba(2, 6, 23, 0.28)',
  'display: grid',
  'gap: 24px',
].join('; ');

const documentBlockStyles = [
  'padding: 16px 18px',
  'border-radius: 18px',
  'border: 1px solid rgba(148, 163, 184, 0.22)',
  'background: rgba(255, 255, 255, 0.88)',
  'cursor: text',
  'transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
].join('; ');

const selectedDocumentBlockStyles = `${documentBlockStyles}; border-color: rgba(59, 130, 246, 0.65); box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2); transform: translateY(-1px);`;
const editingDocumentBlockStyles = `${selectedDocumentBlockStyles}; background: rgba(239, 246, 255, 0.96);`;

const designPageStyles = [
  'position: relative',
  'width: fit-content',
  'padding: 22px',
  'border-radius: 24px',
  'background: rgba(255, 255, 255, 0.92)',
  'box-shadow: 0 26px 70px rgba(15, 23, 42, 0.22)',
].join('; ');

const designFrameBaseStyles = [
  'position: absolute',
  'display: grid',
  'grid-template-rows: auto 1fr',
  'gap: 10px',
  'padding: 14px 16px 16px',
  'border-radius: 18px',
  'border: 1px solid rgba(148, 163, 184, 0.35)',
  'background: rgba(255, 255, 255, 0.86)',
  'box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12)',
  'backdrop-filter: blur(10px)',
  'overflow: hidden',
  'transition: box-shadow 120ms ease, border-color 120ms ease',
].join('; ');

const selectedDesignFrameStyles = `${designFrameBaseStyles}; border-color: rgba(37, 99, 235, 0.72); box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.26), 0 16px 36px rgba(15, 23, 42, 0.18);`;
const editingDesignFrameStyles = `${selectedDesignFrameStyles}; background: rgba(239, 246, 255, 0.95);`;

type FrameBox = ReadyBridgePayload['document']['layout']['frames'][number]['box'];

type DragState = {
  pointerId: number;
  frameId: string;
  originBox: FrameBox;
  startX: number;
  startY: number;
};

function lineClampText(value: string): string {
  return value.length > 0 ? value : 'Empty block';
}

function createLabel(value: string, elementId: string, testId: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  const label = document.createElement('div');
  label.textContent = value;
  label.style.cssText = 'color: #93c5fd; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;';

  const content = document.createElement('div');
  content.id = elementId;
  content.dataset.testid = testId;
  content.style.cssText = 'margin-top: 10px; color: #e2e8f0; font-size: 1rem; line-height: 1.4;';

  wrapper.append(label, content);
  return wrapper;
}

function setElementText(element: Element | null, value: string): void {
  if (element) {
    element.textContent = value;
  }
}

function setFrameElementPosition(frameElement: HTMLElement, box: FrameBox): void {
  frameElement.style.left = `${box.x}px`;
  frameElement.style.top = `${box.y}px`;
  frameElement.style.width = `${box.width}px`;
  frameElement.style.height = `${box.height}px`;
  frameElement.dataset.frameX = String(box.x);
  frameElement.dataset.frameY = String(box.y);
  frameElement.dataset.frameWidth = String(box.width);
  frameElement.dataset.frameHeight = String(box.height);
}

function formatFrameBox(box: FrameBox | null): string {
  if (!box) {
    return 'None';
  }
  return `x:${box.x} y:${box.y} w:${box.width} h:${box.height}`;
}

export type CanvasController = {
  setReadyPayload: (payload: ReadyBridgePayload) => void;
  clear: (message?: string) => void;
  destroy: () => void;
};

export function mountCanvas(rootElement: HTMLElement, engine: DocumentEditorEngine): CanvasController {
  rootElement.innerHTML = '';

  const shell = document.createElement('section');
  shell.id = 'editor-canvas';
  shell.dataset.testid = 'editor-canvas';
  shell.dataset.physicsMode = 'unavailable';
  shell.style.cssText = canvasShellStyles;

  const summaryRow = document.createElement('div');
  summaryRow.style.cssText = canvasStatusStyles;

  const modeLabel = createLabel('Interaction mode', 'editor-affordance-mode', 'editor-affordance-mode');
  const selectedBlockLabel = createLabel('Selected block', 'editor-selected-block', 'editor-selected-block');
  const selectedFrameLabel = createLabel('Selected frame', 'editor-selected-frame', 'editor-selected-frame');
  const dragLabel = createLabel('Drag affordances', 'editor-drag-affordance-status', 'editor-drag-affordance-status');
  const frameBoxLabel = createLabel('Selected frame box', 'editor-selected-frame-box', 'editor-selected-frame-box');
  summaryRow.append(modeLabel, selectedBlockLabel, selectedFrameLabel, dragLabel, frameBoxLabel);

  const pageRoot = document.createElement('div');
  pageRoot.id = 'editor-document-page';
  pageRoot.dataset.testid = 'editor-document-page';
  pageRoot.style.cssText = pageStyles;

  const header = document.createElement('header');
  header.style.cssText = 'display: flex; justify-content: space-between; gap: 16px; align-items: start; flex-wrap: wrap;';

  const headingGroup = document.createElement('div');
  const eyebrow = document.createElement('div');
  eyebrow.textContent = 'DOM-first canvas surface';
  eyebrow.style.cssText = 'color: #475569; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;';

  const title = document.createElement('h2');
  title.id = 'document-title';
  title.dataset.testid = 'document-title';
  title.style.cssText = 'margin: 12px 0 6px; font-size: 2.3rem; line-height: 1.02;';

  const subtitle = document.createElement('p');
  subtitle.style.cssText = 'margin: 0; max-width: 60ch; color: #475569; line-height: 1.6;';
  headingGroup.append(eyebrow, title, subtitle);

  const pageMeta = document.createElement('div');
  pageMeta.id = 'editor-page-metrics';
  pageMeta.dataset.testid = 'editor-page-metrics';
  pageMeta.style.cssText = 'padding: 14px 16px; border-radius: 18px; background: rgba(226, 232, 240, 0.66); color: #0f172a; min-width: 220px;';

  header.append(headingGroup, pageMeta);

  const surfaceRoot = document.createElement('div');
  surfaceRoot.id = 'editor-surface-root';
  surfaceRoot.dataset.testid = 'editor-surface-root';
  surfaceRoot.style.cssText = 'display: grid; gap: 22px;';

  pageRoot.append(header, surfaceRoot);
  shell.append(summaryRow, pageRoot);
  rootElement.append(shell);

  const blockElements = new Map<string, HTMLElement>();
  const frameElements = new Map<string, HTMLElement>();
  let activeTextarea: HTMLTextAreaElement | null = null;
  let activeBlockBody: HTMLElement | null = null;
  let structureKey = '';
  let dragState: DragState | null = null;

  const focusTextarea = () => {
    if (!activeTextarea) {
      return;
    }
    const caret = activeTextarea.value.length;
    activeTextarea.focus();
    activeTextarea.setSelectionRange(caret, caret);
  };

  const updateSnapshotSurfaces = (snapshot: DocumentEditorSnapshot) => {
    shell.dataset.physicsMode = snapshot.interactionMode;
    setElementText(rootElement.querySelector('#editor-affordance-mode'), snapshot.interactionMode);

    const selectionNode = rootElement.querySelector('#editor-selected-block') as HTMLDivElement | null;
    if (selectionNode) {
      const selectedBlock = snapshot.selectedBlockId ?? 'None';
      selectionNode.textContent = selectedBlock;
      selectionNode.dataset.selectedBlockId = snapshot.selectedBlockId ?? '';
    }

    const selectedFrameNode = rootElement.querySelector('#editor-selected-frame') as HTMLDivElement | null;
    if (selectedFrameNode) {
      const selectedFrame = snapshot.selectedFrameId ?? 'None';
      selectedFrameNode.textContent = selectedFrame;
      selectedFrameNode.dataset.selectedFrameId = snapshot.selectedFrameId ?? '';
    }

    const dragNode = rootElement.querySelector('#editor-drag-affordance-status') as HTMLDivElement | null;
    if (dragNode) {
      const affordances = snapshot.interactionMode === 'design' ? 'present' : 'absent';
      dragNode.textContent = affordances;
      dragNode.dataset.dragAffordances = affordances;
    }

    const frameBoxNode = rootElement.querySelector('#editor-selected-frame-box') as HTMLDivElement | null;
    if (frameBoxNode) {
      const box = snapshot.selectedFrameId ? engine.getFrameBox(snapshot.selectedFrameId) : null;
      frameBoxNode.textContent = formatFrameBox(box);
      frameBoxNode.dataset.frameBox = box ? JSON.stringify(box) : '';
    }
  };

  const renderSelectionState = (snapshot: DocumentEditorSnapshot) => {
    for (const [blockId, blockElement] of blockElements.entries()) {
      if (shell.dataset.physicsMode !== 'document') {
        continue;
      }

      if (snapshot.editingBlockId === blockId) {
        blockElement.style.cssText = editingDocumentBlockStyles;
      } else if (snapshot.selectedBlockId === blockId) {
        blockElement.style.cssText = selectedDocumentBlockStyles;
      } else {
        blockElement.style.cssText = documentBlockStyles;
      }
    }

    for (const [frameId, frameElement] of frameElements.entries()) {
      if (shell.dataset.physicsMode !== 'design') {
        continue;
      }

      const blockId = frameElement.dataset.blockId ?? null;
      const isEditing = blockId !== null && snapshot.editingBlockId === blockId;
      const isSelected = snapshot.selectedFrameId === frameId;
      frameElement.style.cssText = isEditing
        ? editingDesignFrameStyles
        : isSelected
          ? selectedDesignFrameStyles
          : designFrameBaseStyles;

      const box = engine.getFrameBox(frameId);
      if (box) {
        setFrameElementPosition(frameElement, box);
      }
      if (frameElement.dataset.frameZIndex) {
        frameElement.style.zIndex = frameElement.dataset.frameZIndex;
      }
    }
  };

  const renderBlockText = (blockId: string) => {
    const blockElement = blockElements.get(blockId) ?? Array.from(frameElements.values()).find((entry) => entry.dataset.blockId === blockId) ?? null;
    if (!blockElement) {
      return;
    }

    const body = blockElement.querySelector<HTMLElement>('[data-role="block-body"]');
    if (!body) {
      return;
    }

    if (engine.getSnapshot().editingBlockId === blockId) {
      return;
    }

    body.textContent = lineClampText(engine.getDisplayText(blockId) ?? engine.getBlockText(blockId) ?? '');
  };

  const beginEditingDom = (blockId: string) => {
    const blockElement = blockElements.get(blockId) ?? Array.from(frameElements.values()).find((entry) => entry.dataset.blockId === blockId) ?? null;
    if (!blockElement) {
      return;
    }

    const body = blockElement.querySelector<HTMLElement>('[data-role="block-body"]');
    if (!body) {
      return;
    }

    if (activeTextarea && activeTextarea.dataset.blockId === blockId) {
      focusTextarea();
      return;
    }

    if (activeTextarea && activeBlockBody) {
      activeBlockBody.replaceChildren(document.createTextNode(lineClampText(engine.getDisplayText(activeTextarea.dataset.blockId ?? '') ?? '')));
      activeTextarea = null;
      activeBlockBody = null;
    }

    const textarea = document.createElement('textarea');
    textarea.id = 'editor-active-textarea';
    textarea.dataset.testid = 'editor-active-textarea';
    textarea.dataset.blockId = blockId;
    textarea.value = engine.getDisplayText(blockId) ?? engine.getBlockText(blockId) ?? '';
    textarea.rows = Math.max(3, textarea.value.split('\n').length + 1);
    textarea.style.cssText = [
      'width: 100%',
      'min-height: 110px',
      'resize: vertical',
      'border: none',
      'outline: none',
      'background: transparent',
      'font: inherit',
      'line-height: 1.65',
      'color: #0f172a',
      'padding: 0',
      'margin: 0',
    ].join('; ');

    textarea.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    textarea.addEventListener('input', () => {
      engine.updateDraft(textarea.value);
      textarea.rows = Math.max(3, textarea.value.split('\n').length + 1);
      engine.scheduleCommit();
    });

    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void engine.commitActive('enter').then(() => {
          textarea.blur();
        });
      }
    });

    textarea.addEventListener('blur', () => {
      void engine.commitActive('blur').finally(() => {
        engine.endEditing();
      });
    });

    body.replaceChildren(textarea);
    activeTextarea = textarea;
    activeBlockBody = body;
    focusTextarea();
  };

  const endEditingDom = () => {
    if (!activeTextarea || !activeBlockBody) {
      return;
    }

    const previousBlockId = activeTextarea.dataset.blockId ?? '';
    activeBlockBody.replaceChildren(document.createTextNode(lineClampText(engine.getDisplayText(previousBlockId) ?? engine.getBlockText(previousBlockId) ?? '')));
    activeTextarea = null;
    activeBlockBody = null;
  };

  const syncEditingDom = (snapshot: DocumentEditorSnapshot) => {
    if (snapshot.editingBlockId) {
      beginEditingDom(snapshot.editingBlockId);
      if (activeTextarea && snapshot.draftText !== null && activeTextarea.value !== snapshot.draftText) {
        const selectionStart = activeTextarea.selectionStart;
        const selectionEnd = activeTextarea.selectionEnd;
        activeTextarea.value = snapshot.draftText;
        activeTextarea.setSelectionRange(selectionStart, selectionEnd);
      }
      return;
    }

    endEditingDom();
  };

  const bindEditableInteractions = (element: HTMLElement, blockId: string, frameId?: string) => {
    element.addEventListener('focus', () => {
      if (frameId) {
        engine.selectFrame(frameId);
      } else {
        engine.selectBlock(blockId);
      }
    });

    element.addEventListener('click', () => {
      if (frameId) {
        engine.selectFrame(frameId);
      } else {
        engine.selectBlock(blockId);
        engine.startEditing(blockId);
      }
    });

    element.addEventListener('dblclick', (event) => {
      event.preventDefault();
      if (frameId) {
        engine.selectFrame(frameId);
      }
      engine.startEditing(blockId);
    });
  };

  const renderDocumentMode = (payload: ReadyBridgePayload) => {
    const nextStructureKey = JSON.stringify({
      physics: payload.physics,
      sections: payload.document.semantic.sections.map((section) => ({
        id: section.id,
        title: section.title,
        blockIds: section.blockIds,
      })),
    });

    subtitle.textContent = 'Document mode renders semantic sections in flow order and commits inline text changes without fixed-position boxes.';

    if (structureKey !== nextStructureKey) {
      structureKey = nextStructureKey;
      surfaceRoot.innerHTML = '';
      blockElements.clear();
      frameElements.clear();

      const blocksById = new Map(payload.document.semantic.blocks.map((block) => [block.id, block]));
      payload.document.semantic.sections.forEach((section) => {
        const sectionElement = document.createElement('section');
        sectionElement.dataset.sectionId = section.id;
        sectionElement.style.cssText = 'display: grid; gap: 12px;';

        const sectionHeading = document.createElement('h3');
        sectionHeading.textContent = section.title;
        sectionHeading.style.cssText = 'margin: 0; font-size: 1.18rem; color: #0f172a;';
        sectionElement.append(sectionHeading);

        const blockList = document.createElement('div');
        blockList.style.cssText = 'display: grid; gap: 12px;';

        section.blockIds.forEach((blockId) => {
          const block = blocksById.get(blockId);
          const article = document.createElement('article');
          article.dataset.blockId = blockId;
          article.dataset.testid = `editor-block-${blockId}`;
          article.style.cssText = documentBlockStyles;
          article.tabIndex = 0;

          const kindLabel = document.createElement('div');
          kindLabel.textContent = `${block?.kind ?? 'missing'} · ${blockId}`;
          kindLabel.style.cssText = 'color: #475569; text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.72rem;';

          const blockBody = document.createElement('div');
          blockBody.dataset.role = 'block-body';
          blockBody.id = `editor-block-text-${blockId}`;
          blockBody.dataset.testid = `editor-block-text-${blockId}`;
          blockBody.style.cssText = 'margin-top: 10px; white-space: pre-wrap; line-height: 1.65;';
          blockBody.textContent = lineClampText(engine.getDisplayText(blockId) ?? block?.text ?? '');

          bindEditableInteractions(article, blockId);

          article.append(kindLabel, blockBody);
          blockList.append(article);
          blockElements.set(blockId, article);
        });

        sectionElement.append(blockList);
        surfaceRoot.append(sectionElement);
      });
    }
  };

  const renderDesignMode = (payload: ReadyBridgePayload) => {
    const nextStructureKey = JSON.stringify({
      physics: payload.physics,
      pages: payload.document.layout.pages.map((page) => ({
        id: page.id,
        size: page.size,
        margin: page.margin,
      })),
      frames: payload.document.layout.frames
        .map((frame) => ({ id: frame.id, pageId: frame.pageId, blockId: frame.blockId, zIndex: frame.zIndex }))
        .sort((left, right) => left.zIndex - right.zIndex),
    });

    subtitle.textContent = 'Design mode renders canonical page geometry and linked fixed frames; drag the handle to persist box coordinates, or double-click a frame to edit its text.';

    if (structureKey !== nextStructureKey) {
      structureKey = nextStructureKey;
      surfaceRoot.innerHTML = '';
      blockElements.clear();
      frameElements.clear();

      const blocksById = new Map(payload.document.semantic.blocks.map((block) => [block.id, block]));
      const framesByPage = new Map<string, typeof payload.document.layout.frames>();
      payload.document.layout.frames.forEach((frame) => {
        const pageFrames = framesByPage.get(frame.pageId) ?? [];
        pageFrames.push(frame);
        framesByPage.set(frame.pageId, pageFrames);
      });

      payload.document.layout.pages.forEach((page) => {
        const pageShell = document.createElement('section');
        pageShell.dataset.pageId = page.id;
        pageShell.dataset.testid = `editor-page-${page.id}`;
        pageShell.style.cssText = designPageStyles;

        const pageHeading = document.createElement('div');
        pageHeading.style.cssText = 'display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 14px; color: #475569;';
        pageHeading.innerHTML = `<strong style="letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.72rem;">Page ${page.id}</strong><span>${page.size.width}×${page.size.height}</span>`;

        const canvas = document.createElement('div');
        canvas.dataset.testid = `editor-design-page-${page.id}`;
        canvas.style.cssText = [
          'position: relative',
          `width: ${page.size.width}px`,
          `height: ${page.size.height}px`,
          'border-radius: 20px',
          'background: linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(241, 245, 249, 0.98))',
          'overflow: hidden',
          'background-image: linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
          'background-size: 24px 24px',
          'box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.28)',
        ].join('; ');

        const marginGuide = document.createElement('div');
        marginGuide.style.cssText = [
          'position: absolute',
          `left: ${page.margin.left}px`,
          `top: ${page.margin.top}px`,
          `right: ${page.margin.right}px`,
          `bottom: ${page.margin.bottom}px`,
          'border: 1px dashed rgba(59, 130, 246, 0.35)',
          'border-radius: 14px',
          'pointer-events: none',
        ].join('; ');
        canvas.append(marginGuide);

        const pageFrames = (framesByPage.get(page.id) ?? []).slice().sort((left, right) => left.zIndex - right.zIndex);
        pageFrames.forEach((frame) => {
          const block = blocksById.get(frame.blockId);
          const article = document.createElement('article');
          article.dataset.frameId = frame.id;
          article.dataset.blockId = frame.blockId;
          article.dataset.testid = `editor-frame-${frame.id}`;
          article.tabIndex = 0;
          article.style.cssText = designFrameBaseStyles;
          setFrameElementPosition(article, engine.getFrameBox(frame.id) ?? frame.box);
          article.dataset.frameZIndex = String(frame.zIndex);
          article.style.zIndex = String(frame.zIndex);

          const handle = document.createElement('button');
          handle.type = 'button';
          handle.dataset.testid = `frame-handle-${frame.id}`;
          handle.style.cssText = [
            'justify-self: end',
            'width: 28px',
            'height: 28px',
            'border-radius: 999px',
            'border: none',
            'background: radial-gradient(circle at 35% 35%, #60a5fa, #1d4ed8)',
            'box-shadow: 0 8px 16px rgba(37, 99, 235, 0.35)',
            'cursor: grab',
          ].join('; ');
          handle.setAttribute('aria-label', `Drag frame ${frame.id}`);
          handle.title = `Drag ${frame.id}`;

          handle.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const originBox = engine.getFrameBox(frame.id) ?? frame.box;
            dragState = {
              pointerId: event.pointerId,
              frameId: frame.id,
              originBox,
              startX: event.clientX,
              startY: event.clientY,
            };
            engine.selectFrame(frame.id);
            handle.setPointerCapture(event.pointerId);
            handle.style.cursor = 'grabbing';
          });

          const meta = document.createElement('div');
          meta.textContent = `${block?.kind ?? 'missing'} · ${frame.id} · ${frame.blockId}`;
          meta.style.cssText = 'color: #334155; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.68rem;';

          const blockBody = document.createElement('div');
          blockBody.dataset.role = 'block-body';
          blockBody.id = `editor-block-text-${frame.blockId}`;
          blockBody.dataset.testid = `editor-block-text-${frame.blockId}`;
          blockBody.style.cssText = 'white-space: pre-wrap; line-height: 1.55; color: #0f172a; align-self: start;';
          blockBody.textContent = lineClampText(engine.getDisplayText(frame.blockId) ?? block?.text ?? '');

          bindEditableInteractions(article, frame.blockId, frame.id);
          blockBody.addEventListener('click', (event) => {
            event.stopPropagation();
            engine.selectFrame(frame.id);
          });
          blockBody.addEventListener('dblclick', (event) => {
            event.preventDefault();
            event.stopPropagation();
            engine.selectFrame(frame.id);
            engine.startEditing(frame.blockId);
          });

          article.append(handle, meta, blockBody);
          canvas.append(article);
          frameElements.set(frame.id, article);
        });

        pageShell.append(pageHeading, canvas);
        surfaceRoot.append(pageShell);
      });
    }
  };

  const renderPayload = (payload: ReadyBridgePayload) => {
    const firstPage = payload.document.layout.pages[0];
    title.textContent = payload.document.metadata.title;
    pageMeta.textContent = `${payload.document.layout.pages.length} page${payload.document.layout.pages.length === 1 ? '' : 's'} · ${payload.document.semantic.sections.length} section${payload.document.semantic.sections.length === 1 ? '' : 's'} · ${payload.document.semantic.blocks.length} blocks · ${firstPage.size.width}×${firstPage.size.height}`;

    if (payload.physics === 'design') {
      renderDesignMode(payload);
    } else {
      renderDocumentMode(payload);
    }

    updateSnapshotSurfaces(engine.getSnapshot());
    renderSelectionState(engine.getSnapshot());
    syncEditingDom(engine.getSnapshot());
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextBox = {
      ...dragState.originBox,
      x: Math.round(dragState.originBox.x + (event.clientX - dragState.startX)),
      y: Math.round(dragState.originBox.y + (event.clientY - dragState.startY)),
    };
    engine.updateFrameBox(dragState.frameId, nextBox);
  };

  const settleDrag = (event: PointerEvent, reason: 'pointerup' | 'pointercancel') => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const activeDrag = dragState;
    dragState = null;
    const handle = rootElement.querySelector(`[data-testid="frame-handle-${activeDrag.frameId}"]`) as HTMLElement | null;
    if (handle) {
      handle.style.cursor = 'grab';
    }
    void engine.commitFrameMove(activeDrag.frameId, reason);
  };

  const onPointerUp = (event: PointerEvent) => settleDrag(event, 'pointerup');
  const onPointerCancel = (event: PointerEvent) => settleDrag(event, 'pointercancel');

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);

  const unsubscribe = engine.subscribe((snapshot) => {
    updateSnapshotSurfaces(snapshot);
    renderSelectionState(snapshot);
    syncEditingDom(snapshot);

    for (const blockId of blockElements.keys()) {
      renderBlockText(blockId);
    }
    for (const frameElement of frameElements.values()) {
      const blockId = frameElement.dataset.blockId;
      if (blockId) {
        renderBlockText(blockId);
      }
    }
  });

  return {
    setReadyPayload: (payload) => {
      shell.dataset.physicsMode = payload.physics;
      renderPayload(payload);
    },
    clear: (message = 'Waiting for a ready document payload…') => {
      shell.dataset.physicsMode = 'unavailable';
      structureKey = '';
      blockElements.clear();
      frameElements.clear();
      dragState = null;
      endEditingDom();
      title.textContent = 'Canvas unavailable';
      subtitle.textContent = 'The editor is waiting for a canonical bridge payload.';
      pageMeta.textContent = message;
      surfaceRoot.innerHTML = '';
      const emptyState = document.createElement('div');
      emptyState.textContent = message;
      emptyState.style.cssText = 'padding: 18px; border-radius: 18px; background: rgba(226, 232, 240, 0.5); color: #334155;';
      surfaceRoot.append(emptyState);
      updateSnapshotSurfaces(engine.getSnapshot());
    },
    destroy: () => {
      unsubscribe();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      endEditingDom();
      rootElement.innerHTML = '';
    },
  };
}
