import type { ReadyBridgePayload } from '../../bridge-client';
import { createGhostPreviewLayer, type GhostPreviewLayer } from '../../ui/GhostPreview';
import type { DocumentEditorEngine, DocumentEditorSnapshot } from '../engine';
import type { PointerController } from './pointer';
import { designPaperChromeStyles, pageWrapperStyles } from './styles';
import { lineClampText } from './text-editing';

export type FreeformSurfaceController = {
  syncHud: (snapshot: DocumentEditorSnapshot) => void;
};

const freeformElementStyles = [
  'position: absolute',
  'padding: 8px 10px',
  'border-radius: 4px',
  'border: 1px solid rgba(130, 148, 165, 0.4)',
  'background: rgba(255, 255, 255, 0.9)',
  'overflow: hidden',
  'cursor: grab',
  'box-sizing: border-box',
].join('; ');

function uniqueId(base: string, taken: Set<string>): string {
  let candidate = base;
  while (taken.has(candidate)) {
    candidate = `${candidate}X`;
  }
  taken.add(candidate);
  return candidate;
}

export function setFreeformMoveState(rootElement: HTMLElement, state: 'idle' | 'preview' | 'blocked' | 'saving', note?: string): void {
  const stateNode = rootElement.querySelector('#freeform-move-state');
  if (stateNode instanceof HTMLElement) {
    stateNode.dataset.moveState = state;
    stateNode.textContent = state;
  }
  if (note !== undefined) {
    const noteNode = rootElement.querySelector('#freeform-action-note');
    if (noteNode instanceof HTMLElement) {
      noteNode.textContent = note;
    }
  }
}

// The freeform surface treats every frame-backed element on the page as
// directly manipulable: grab anywhere to move, use the corner handle to
// resize, add or remove dividers — all through structured operations.
export function renderFreeformSurface(deps: {
  engine: DocumentEditorEngine;
  surfaceRoot: HTMLElement;
  // HUD and notes mount here — outside the page, so they are never clipped
  // by page bounds nor scaled by canvas zoom.
  controlsHost: HTMLElement;
  frameElements: Map<string, HTMLElement>;
  pageCanvasElements: Map<string, HTMLElement>;
  ghostLayers: Map<string, GhostPreviewLayer>;
  pointer: PointerController;
  payload: ReadyBridgePayload;
}): FreeformSurfaceController {
  const { engine, surfaceRoot, controlsHost, frameElements, pageCanvasElements, ghostLayers, pointer, payload } = deps;

  const groups = payload.document.layout.frameGroups;
  const groupByFrameId = new Map<string, (typeof groups)[number]>();
  for (const group of groups) {
    for (const frameId of group.frameIds) {
      groupByFrameId.set(frameId, group);
    }
  }

  // --- HUD ---
  const hud = document.createElement('div');
  hud.id = 'freeform-hud';
  hud.dataset.testid = 'freeform-hud';
  hud.setAttribute('role', 'toolbar');
  hud.setAttribute('aria-label', 'Freeform actions');
  hud.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap; align-items: center;';

  const addDividerButton = document.createElement('button');
  addDividerButton.type = 'button';
  addDividerButton.id = 'freeform-add-divider';
  addDividerButton.dataset.testid = 'freeform-add-divider';
  addDividerButton.textContent = 'Add divider';
  addDividerButton.className = 'sfrb-button';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.id = 'freeform-remove-element';
  removeButton.dataset.testid = 'freeform-remove-element';
  removeButton.textContent = 'Remove element';
  removeButton.className = 'sfrb-button';
  removeButton.disabled = true;

  // The label stays outside the value span: tests read the span's bare value.
  const readout = (id: string, label: string): HTMLElement => {
    const wrapper = document.createElement('span');
    wrapper.className = 'sfrb-status-cell';
    const labelNode = document.createElement('span');
    labelNode.className = 'sfrb-status-cell-label';
    labelNode.textContent = label;
    const value = document.createElement('span');
    value.id = id;
    value.dataset.testid = id;
    value.textContent = 'None';
    wrapper.append(labelNode, value);
    return wrapper;
  };

  const selectedIdReadout = readout('freeform-selected-element-id', 'Element');
  const selectedKindReadout = readout('freeform-selected-element-kind', 'Kind');
  const geometryReadout = readout('freeform-selected-element-geometry', 'Geometry');

  const moveState = document.createElement('span');
  moveState.id = 'freeform-move-state';
  moveState.dataset.testid = 'freeform-move-state';
  moveState.dataset.moveState = 'idle';
  moveState.textContent = 'idle';
  moveState.style.cssText = 'font-size: 11px; font-weight: 600; color: var(--sfrb-accent); text-transform: uppercase; letter-spacing: 0.07em;';

  const note = document.createElement('div');
  note.id = 'freeform-action-note';
  note.dataset.testid = 'freeform-action-note';
  note.setAttribute('role', 'status');
  note.style.cssText = 'flex-basis: 100%; color: var(--sfrb-ink-soft); font-size: 12px; line-height: 1.4;';
  note.textContent = 'Grab any element to move it; use the corner handle to resize.';

  hud.append(addDividerButton, removeButton, selectedIdReadout, selectedKindReadout, geometryReadout, moveState, note);
  controlsHost.append(hud);

  const setNote = (message: string) => {
    note.textContent = message;
  };

  const dispatchWithNote = async (operation: Parameters<DocumentEditorEngine['dispatch']>[0], successNote: string) => {
    try {
      const result = await engine.dispatch(operation);
      if (result.ok) {
        setNote(successNote);
        return;
      }
      setNote(`${result.code}: ${result.message}`);
    } catch (error) {
      setNote(`Bridge unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  addDividerButton.addEventListener('click', () => {
    const page = payload.document.layout.pages[0];
    const sections = payload.document.semantic.sections;
    const lastSection = sections[sections.length - 1];
    if (!page || !lastSection) {
      return;
    }

    const takenBlockIds = new Set(payload.document.semantic.blocks.map((block) => block.id));
    const takenFrameIds = new Set(payload.document.layout.frames.map((frame) => frame.id));
    const lowestEdge = payload.document.layout.frames
      .filter((frame) => frame.pageId === page.id)
      .reduce((lowest, frame) => {
        const box = engine.getFrameBox(frame.id) ?? frame.box;
        return Math.max(lowest, box.y + box.height);
      }, page.margin.top);

    void dispatchWithNote(
      {
        op: 'insert-block',
        sectionId: lastSection.id,
        block: { id: uniqueId('dividerBlock1', takenBlockIds), kind: 'divider', text: '' },
        frame: {
          id: uniqueId('dividerFrame1', takenFrameIds),
          pageId: page.id,
          box: {
            x: page.margin.left,
            y: Math.min(lowestEdge + 8, page.size.height - page.margin.bottom - 12),
            width: page.size.width - page.margin.left - page.margin.right,
            height: 12,
          },
        },
      },
      'Added a divider element.',
    );
  });

  removeButton.addEventListener('click', () => {
    const snapshot = engine.getSnapshot();
    const frame = payload.document.layout.frames.find((entry) => entry.id === snapshot.selectedFrameId);
    if (!frame) {
      return;
    }

    void dispatchWithNote({ op: 'remove-block', blockId: frame.blockId }, `Removed ${frame.blockId}.`);
  });

  // --- Pages and elements ---
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
    pageShell.style.cssText = pageWrapperStyles;

    const canvas = document.createElement('div');
    canvas.dataset.testid = `editor-freeform-page-${page.id}`;
    canvas.style.cssText = [
      'position: relative',
      `width: ${page.size.width}px`,
      `height: ${page.size.height}px`,
      'overflow: hidden',
      designPaperChromeStyles,
    ].join('; ');

    const pageFrames = (framesByPage.get(page.id) ?? []).slice().sort((left, right) => left.zIndex - right.zIndex);
    pageFrames.forEach((frame) => {
      const block = blocksById.get(frame.blockId);
      const group = groupByFrameId.get(frame.id);
      const element = document.createElement('article');
      element.dataset.frameId = frame.id;
      element.dataset.blockId = frame.blockId;
      element.dataset.testid = `editor-frame-${frame.id}`;
      element.dataset.elementKind = block?.kind ?? 'missing';
      if (group) {
        element.dataset.groupId = group.id;
        element.dataset.groupLocked = String(group.locked);
      }
      element.dataset.placement = frame.placement;
      element.tabIndex = 0;
      element.setAttribute('aria-label', `${block?.kind ?? 'element'}: ${(block?.text ?? frame.id).slice(0, 40)}`);
      element.style.cssText = freeformElementStyles;
      const box = engine.getFrameBox(frame.id) ?? frame.box;
      element.style.left = `${box.x}px`;
      element.style.top = `${box.y}px`;
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
      element.dataset.frameX = String(box.x);
      element.dataset.frameY = String(box.y);
      element.dataset.frameWidth = String(box.width);
      element.dataset.frameHeight = String(box.height);
      element.style.zIndex = String(frame.zIndex);
      element.dataset.frameZIndex = String(frame.zIndex);

      const blockBody = document.createElement('div');
      blockBody.dataset.role = 'block-body';
      blockBody.id = `editor-block-text-${frame.blockId}`;
      blockBody.dataset.testid = `editor-block-text-${frame.blockId}`;
      blockBody.style.cssText = 'white-space: pre-wrap; line-height: 1.55; color: #0f172a; height: 100%; overflow: hidden; pointer-events: none;';
      if (block?.kind === 'divider') {
        blockBody.style.borderTop = '1px solid currentColor';
        blockBody.textContent = '';
      } else {
        blockBody.textContent = lineClampText(engine.getDisplayText(frame.blockId) ?? block?.text ?? '');
      }
      element.append(blockBody);

      const resizeHandle = document.createElement('button');
      resizeHandle.type = 'button';
      resizeHandle.dataset.testid = `freeform-resize-${frame.id}`;
      resizeHandle.setAttribute('aria-label', `Resize element ${frame.id}`);
      // Kept fully inside the page (the canvas clips overflow) and shown only
      // on selection; a small quarter-round grip instead of a solid block so
      // it stays off the text.
      resizeHandle.style.cssText = [
        'position: absolute',
        'right: 0',
        'bottom: 0',
        'width: 14px',
        'height: 14px',
        'padding: 0',
        'border: none',
        'border-top-left-radius: 10px',
        'background: var(--sfrb-accent)',
        'opacity: 0.85',
        'cursor: nwse-resize',
        'display: none',
      ].join('; ');
      element.append(resizeHandle);

      const blockIfLocked = (): boolean => {
        const currentGroup = groupByFrameId.get(frame.id);
        if (currentGroup?.locked) {
          engine.selectFrame(frame.id);
          setFreeformMoveState(
            surfaceRoot.ownerDocument?.body ?? surfaceRoot,
            'blocked',
            `Element "${frame.id}" is locked in group "${currentGroup.id}" — unlock it in the tile lens first.`,
          );
          return true;
        }
        return false;
      };

      element.addEventListener('pointerdown', (event) => {
        if (event.target === resizeHandle) {
          return;
        }
        event.preventDefault();

        if (blockIfLocked()) {
          return;
        }

        const originBox = engine.getFrameBox(frame.id) ?? frame.box;
        setFreeformMoveState(surfaceRoot.ownerDocument?.body ?? surfaceRoot, 'preview');
        pointer.beginFrameDrag(event, { id: frame.id, blockId: frame.blockId }, originBox, element);
      });

      resizeHandle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (blockIfLocked()) {
          return;
        }

        const originBox = engine.getFrameBox(frame.id) ?? frame.box;
        setFreeformMoveState(surfaceRoot.ownerDocument?.body ?? surfaceRoot, 'preview');
        pointer.beginFrameResize(event, { id: frame.id, blockId: frame.blockId }, originBox, resizeHandle);
      });

      element.addEventListener('dblclick', (event) => {
        event.preventDefault();
        if (block?.kind === 'divider') {
          return;
        }
        engine.selectFrame(frame.id);
        engine.startEditing(frame.blockId);
      });

      canvas.append(element);
      frameElements.set(frame.id, element);
    });

    const ghostLayer = createGhostPreviewLayer();
    ghostLayers.set(page.id, ghostLayer);
    canvas.append(ghostLayer.element);
    pageCanvasElements.set(page.id, canvas);

    pageShell.append(canvas);
    surfaceRoot.append(pageShell);
  });

  const syncHud = (snapshot: DocumentEditorSnapshot) => {
    const frame = payload.document.layout.frames.find((entry) => entry.id === snapshot.selectedFrameId);
    const block = frame ? blocksById.get(frame.blockId) : undefined;
    const box = frame ? (engine.getFrameBox(frame.id) ?? frame.box) : null;

    const idNode = hud.querySelector('#freeform-selected-element-id');
    if (idNode) {
      idNode.textContent = frame?.id ?? 'None';
    }
    const kindNode = hud.querySelector('#freeform-selected-element-kind');
    if (kindNode) {
      kindNode.textContent = block?.kind ?? 'None';
    }
    const geometryNode = hud.querySelector('#freeform-selected-element-geometry');
    if (geometryNode) {
      geometryNode.textContent = box ? `x:${box.x} y:${box.y} w:${box.width} h:${box.height}` : 'None';
    }

    removeButton.disabled = !frame || payload.document.semantic.blocks.length <= 1;

    // Resize handles show on the selected element only.
    for (const [frameId, element] of frameElements.entries()) {
      const handle = element.querySelector<HTMLElement>(`[data-testid="freeform-resize-${frameId}"]`);
      if (handle) {
        handle.style.display = snapshot.selectedFrameId === frameId ? 'block' : 'none';
      }
    }

    const moveStateNode = hud.querySelector('#freeform-move-state');
    if (moveStateNode instanceof HTMLElement && moveStateNode.dataset.moveState !== 'blocked') {
      const nextState = pointer.isDragging() ? 'preview' : snapshot.saveState === 'saving' ? 'saving' : 'idle';
      moveStateNode.dataset.moveState = nextState;
      moveStateNode.textContent = nextState;
    }
  };

  syncHud(engine.getSnapshot());

  return { syncHud };
}
