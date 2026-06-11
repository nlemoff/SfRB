import type { ReadyBridgePayload } from '../../bridge-client';
import type { GhostPreviewLayer, GhostPreviewModel } from '../../ui/GhostPreview';
import type { DocumentEditorEngine, DocumentEditorSnapshot, EditorLens, FrameBox } from '../engine';
import { renderFlowSurface } from './flow-surface';
import { renderFreeformSurface, setFreeformMoveState, type FreeformSurfaceController } from './freeform-surface';
import { renderTileSurface, setFrameElementPosition, setTileActionNote, type TileSurfaceController } from './tile-surface';
import { createOverflowController, createDocumentKey, type CanvasOverflowDiagnostics } from './overflow';
import { createPointerController } from './pointer';
import { createTextEditingController } from './text-editing';
import {
  canvasShellStyles,
  canvasStatusStyles,
  designFrameBaseStyles,
  documentBlockStyles,
  editingDesignFrameStyles,
  editingDocumentBlockStyles,
  pageStyles,
  selectedDesignFrameStyles,
  selectedDocumentBlockStyles,
} from './styles';

export type { CanvasOverflowDiagnostics } from './overflow';

export type CanvasConsultantPreview = GhostPreviewModel & {
  sourceDocumentKey: string;
};

export type CanvasController = {
  setReadyPayload: (payload: ReadyBridgePayload) => void;
  setGhostPreview: (preview: CanvasConsultantPreview | null) => void;
  clear: (message?: string) => void;
  destroy: () => void;
};

type ActiveSurface = 'flow' | 'tile' | 'freeform' | 'none';

function createLabel(value: string, elementId: string, testId: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  const label = document.createElement('div');
  label.textContent = value;
  label.style.cssText = 'color: #2563eb; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.72rem;';

  const content = document.createElement('div');
  content.id = elementId;
  content.dataset.testid = testId;
  content.style.cssText = 'margin-top: 10px; color: #0f172a; font-size: 1rem; line-height: 1.4;';

  wrapper.append(label, content);
  return wrapper;
}

function setElementText(element: Element | null, value: string): void {
  if (element) {
    element.textContent = value;
  }
}

function formatFrameBox(box: FrameBox | null): string {
  if (!box) {
    return 'None';
  }
  return `x:${box.x} y:${box.y} w:${box.width} h:${box.height}`;
}

export function mountCanvas(
  rootElement: HTMLElement,
  engine: DocumentEditorEngine,
  options: {
    onOverflowChange?: (diagnostics: CanvasOverflowDiagnostics) => void;
  } = {},
): CanvasController {
  rootElement.innerHTML = '';

  const shell = document.createElement('section');
  shell.id = 'editor-canvas';
  shell.dataset.testid = 'editor-canvas';
  shell.dataset.physicsMode = 'unavailable';
  shell.dataset.activeLens = 'text';
  shell.dataset.activeSurface = 'none';
  shell.setAttribute('role', 'region');
  shell.setAttribute('aria-label', 'Resume canvas');
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
  const pageCanvasElements = new Map<string, HTMLElement>();
  const ghostLayers = new Map<string, GhostPreviewLayer>();
  let structureKey = '';
  let payload: ReadyBridgePayload | null = null;
  let ghostPreview: CanvasConsultantPreview | null = null;
  let activeSurface: ActiveSurface = 'none';
  let tileControls: TileSurfaceController | null = null;
  let freeformControls: FreeformSurfaceController | null = null;

  const textEditing = createTextEditingController({
    engine,
    getBlockHost: (blockId) =>
      blockElements.get(blockId) ??
      Array.from(frameElements.values()).find((entry) => entry.dataset.blockId === blockId) ??
      null,
  });

  const overflow = createOverflowController({
    engine,
    getPayload: () => payload,
    frameElements,
    isDragging: () => pointer.isDragging(),
    onChange: options.onOverflowChange,
  });

  const pointer = createPointerController({
    engine,
    rootElement,
    onDragStart: (frameId, blockId) => {
      overflow.emitSettling(frameId, blockId);
    },
    onDragSettled: () => {
      overflow.schedule('snapshot');
    },
    onGroupDragSettled: (groupId, memberIds, dx, dy) => {
      if (dx === 0 && dy === 0) {
        return;
      }
      void engine.dispatch({ op: 'move-group', groupId, dx, dy }).then(
        (result) => {
          if (result.ok) {
            setTileActionNote(rootElement, `Moved group "${groupId}" as one composition.`);
            return;
          }
          engine.revertFrameOverrides(memberIds);
          setTileActionNote(rootElement, `${result.code}: ${result.message}`);
        },
        (error: unknown) => {
          engine.revertFrameOverrides(memberIds);
          setTileActionNote(rootElement, `Bridge unavailable: ${error instanceof Error ? error.message : String(error)}`);
        },
      );
    },
  });
  pointer.attach();

  const renderGhostPreview = () => {
    for (const layer of ghostLayers.values()) {
      layer.render(null);
    }

    if (!payload || payload.physics !== 'design' || !ghostPreview || ghostPreview.sourceDocumentKey !== createDocumentKey(payload)) {
      return;
    }

    const frame = payload.document.layout.frames.find((entry) => entry.id === ghostPreview.frameId);
    if (!frame) {
      return;
    }

    const layer = ghostLayers.get(frame.pageId);
    layer?.render(ghostPreview);
  };

  const updateSnapshotSurfaces = (snapshot: DocumentEditorSnapshot) => {
    shell.dataset.physicsMode = snapshot.interactionMode;
    shell.dataset.activeLens = snapshot.activeLens;
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
      const affordances = snapshot.interactionMode === 'design' && snapshot.activeLens !== 'text' ? 'present' : 'absent';
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
      if (activeSurface !== 'flow') {
        continue;
      }

      if (snapshot.editingBlockId === blockId) {
        blockElement.style.cssText = editingDocumentBlockStyles;
      } else if (snapshot.selectedBlockId === blockId) {
        blockElement.style.cssText = selectedDocumentBlockStyles;
      } else {
        blockElement.style.cssText = documentBlockStyles;
      }
      blockElement.setAttribute('aria-current', snapshot.selectedBlockId === blockId ? 'true' : 'false');
    }

    for (const [frameId, frameElement] of frameElements.entries()) {
      if (activeSurface === 'freeform') {
        const isSelected = snapshot.selectedFrameId === frameId;
        frameElement.style.borderColor = isSelected ? 'rgba(37, 99, 235, 0.85)' : 'rgba(148, 163, 184, 0.4)';
        frameElement.style.boxShadow = isSelected ? '0 0 0 3px rgba(96, 165, 250, 0.24)' : 'none';
        frameElement.setAttribute('aria-current', isSelected ? 'true' : 'false');
        const box = engine.getFrameBox(frameId);
        if (box) {
          setFrameElementPosition(frameElement, box);
        }
        continue;
      }

      if (activeSurface !== 'tile') {
        continue;
      }

      const blockId = frameElement.dataset.blockId ?? null;
      const isEditing = blockId !== null && snapshot.editingBlockId === blockId;
      const isSelected = snapshot.selectedFrameId === frameId;
      const isMultiSelected = snapshot.multiSelectedFrameIds.includes(frameId);
      frameElement.style.cssText = isEditing
        ? editingDesignFrameStyles
        : isSelected
          ? selectedDesignFrameStyles
          : isMultiSelected
            ? `${designFrameBaseStyles}; border-color: rgba(37, 99, 235, 0.72); border-style: dashed;`
            : designFrameBaseStyles;
      frameElement.dataset.multiSelected = String(isMultiSelected);
      frameElement.setAttribute('aria-current', isSelected ? 'true' : 'false');

      const box = engine.getFrameBox(frameId);
      if (box) {
        setFrameElementPosition(frameElement, box);
      }
      if (frameElement.dataset.frameZIndex) {
        frameElement.style.zIndex = frameElement.dataset.frameZIndex;
      }
    }

    renderGhostPreview();
  };

  const bindEditableInteractions = (element: HTMLElement, blockId: string, frameId?: string) => {
    // Shift-click extends the selection. Without this, mousedown would move
    // focus first and the focus handler would reset the multi-selection
    // before the click handler could toggle it.
    element.addEventListener('pointerdown', (event) => {
      if (frameId && event.shiftKey) {
        event.preventDefault();
      }
    });

    element.addEventListener('focus', () => {
      if (frameId) {
        engine.selectFrame(frameId);
      } else {
        engine.selectBlock(blockId);
      }
    });

    element.addEventListener('click', (event) => {
      if (frameId) {
        if (event.shiftKey) {
          engine.toggleFrameInSelection(frameId);
        } else {
          engine.selectFrame(frameId);
        }
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

  const clearSurfaceState = () => {
    surfaceRoot.innerHTML = '';
    blockElements.clear();
    frameElements.clear();
    pageCanvasElements.clear();
    ghostLayers.clear();
  };

  const computeStructureKey = (nextPayload: ReadyBridgePayload, lens: EditorLens): string => {
    if (nextPayload.physics === 'design' && lens === 'freeform') {
      return JSON.stringify({
        surface: 'freeform',
        pages: nextPayload.document.layout.pages.map((page) => ({ id: page.id, size: page.size, margin: page.margin })),
        frames: nextPayload.document.layout.frames
          .map((frame) => ({ id: frame.id, pageId: frame.pageId, blockId: frame.blockId, zIndex: frame.zIndex, placement: frame.placement }))
          .sort((left, right) => left.zIndex - right.zIndex),
        groups: nextPayload.document.layout.frameGroups.map((group) => ({
          id: group.id,
          frameIds: group.frameIds,
          locked: group.locked,
        })),
      });
    }

    if (nextPayload.physics === 'design' && lens === 'tile') {
      return JSON.stringify({
        surface: 'tile',
        pages: nextPayload.document.layout.pages.map((page) => ({ id: page.id, size: page.size, margin: page.margin })),
        frames: nextPayload.document.layout.frames
          .map((frame) => ({ id: frame.id, pageId: frame.pageId, blockId: frame.blockId, zIndex: frame.zIndex }))
          .sort((left, right) => left.zIndex - right.zIndex),
        // Group membership and lock state drive badges, handles, and frame
        // datasets, so group changes must rebuild the surface (box-only moves
        // intentionally do not).
        groups: nextPayload.document.layout.frameGroups.map((group) => ({
          id: group.id,
          frameIds: group.frameIds,
          locked: group.locked,
        })),
      });
    }

    return JSON.stringify({
      surface: 'flow',
      physics: nextPayload.physics,
      sections: nextPayload.document.semantic.sections.map((section) => ({
        id: section.id,
        title: section.title,
        blockIds: section.blockIds,
      })),
    });
  };

  const renderPayload = (nextPayload: ReadyBridgePayload) => {
    payload = nextPayload;
    const lens = engine.getSnapshot().activeLens;
    const firstPage = nextPayload.document.layout.pages[0];
    title.textContent = nextPayload.document.metadata.title;
    pageMeta.textContent = `${nextPayload.document.layout.pages.length} page${nextPayload.document.layout.pages.length === 1 ? '' : 's'} · ${nextPayload.document.semantic.sections.length} section${nextPayload.document.semantic.sections.length === 1 ? '' : 's'} · ${nextPayload.document.semantic.blocks.length} blocks · ${firstPage.size.width}×${firstPage.size.height}`;

    const nextStructureKey = computeStructureKey(nextPayload, lens);
    const nextSurface: ActiveSurface = nextPayload.physics === 'design' && lens === 'tile'
      ? 'tile'
      : nextPayload.physics === 'design' && lens === 'freeform'
        ? 'freeform'
        : 'flow';

    if (structureKey !== nextStructureKey) {
      structureKey = nextStructureKey;
      clearSurfaceState();
      activeSurface = nextSurface;
      shell.dataset.activeSurface = nextSurface;
      tileControls = null;
      freeformControls = null;

      if (nextSurface === 'tile') {
        subtitle.textContent = 'Design mode renders canonical page geometry and linked fixed frames; drag the handle to persist box coordinates, or double-click a frame to edit its text.';
        tileControls = renderTileSurface({
          engine,
          surfaceRoot,
          frameElements,
          pageCanvasElements,
          ghostLayers,
          pointer,
          bindEditableInteractions,
          payload: nextPayload,
        });
      } else if (nextSurface === 'freeform') {
        subtitle.textContent = 'Freeform mode treats every element on the page as directly movable and resizable; leaving it reconciles your placements explicitly.';
        freeformControls = renderFreeformSurface({
          engine,
          surfaceRoot,
          frameElements,
          pageCanvasElements,
          ghostLayers,
          pointer,
          payload: nextPayload,
        });
      } else {
        subtitle.textContent = 'Document mode renders semantic sections in flow order and commits inline text changes without fixed-position boxes.';
        renderFlowSurface({
          engine,
          surfaceRoot,
          blockElements,
          bindEditableInteractions,
          payload: nextPayload,
        });
      }
    }

    if (nextSurface === 'tile' || nextSurface === 'freeform') {
      renderGhostPreview();
    }

    updateSnapshotSurfaces(engine.getSnapshot());
    renderSelectionState(engine.getSnapshot());
    textEditing.syncEditingDom(engine.getSnapshot());
  };

  const onShellKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target || target.id === 'editor-active-textarea') {
      return;
    }

    const frameId = target.closest<HTMLElement>('[data-frame-id]')?.dataset.frameId ?? null;
    if (!frameId) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      engine.selectFrame(null);
      return;
    }

    if (event.key === 'Enter') {
      const blockId = engine.getPayload()?.document.layout.frames.find((frame) => frame.id === frameId)?.blockId;
      if (blockId) {
        event.preventDefault();
        engine.selectFrame(frameId);
        engine.startEditing(blockId);
      }
      return;
    }

    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = arrows[event.key];
    if (!delta) {
      return;
    }

    event.preventDefault();

    const lockedGroup = engine
      .getPayload()
      ?.document.layout.frameGroups.find((group) => group.locked && group.frameIds.includes(frameId));
    if (lockedGroup) {
      engine.selectFrame(frameId);
      if (activeSurface === 'freeform') {
        setFreeformMoveState(
          rootElement,
          'blocked',
          `Element "${frameId}" is locked in group "${lockedGroup.id}" — unlock it in the tile lens first.`,
        );
      } else {
        setTileActionNote(
          rootElement,
          `Frame "${frameId}" is locked in group "${lockedGroup.id}" — drag the group handle or unlock it.`,
        );
      }
      return;
    }

    const step = event.shiftKey ? 10 : 1;
    engine.selectFrame(frameId);
    pointer.nudgeFrame(frameId, delta[0] * step, delta[1] * step);
  };
  shell.addEventListener('keydown', onShellKeyDown);

  const onWindowResize = () => overflow.schedule('resize');
  window.addEventListener('resize', onWindowResize);

  let lastRenderedLens: EditorLens = engine.getSnapshot().activeLens;
  const unsubscribe = engine.subscribe((snapshot) => {
    if (payload && snapshot.activeLens !== lastRenderedLens) {
      lastRenderedLens = snapshot.activeLens;
      renderPayload(payload);
    } else {
      lastRenderedLens = snapshot.activeLens;
    }

    updateSnapshotSurfaces(snapshot);
    renderSelectionState(snapshot);
    textEditing.syncEditingDom(snapshot);
    tileControls?.syncToolbar(snapshot);
    freeformControls?.syncHud(snapshot);

    for (const blockId of blockElements.keys()) {
      textEditing.renderBlockText(blockId);
    }
    for (const frameElement of frameElements.values()) {
      const blockId = frameElement.dataset.blockId;
      if (blockId) {
        textEditing.renderBlockText(blockId);
      }
    }

    overflow.schedule('snapshot');
  });

  return {
    setReadyPayload: (nextPayload) => {
      shell.dataset.physicsMode = nextPayload.physics;
      renderPayload(nextPayload);
      overflow.schedule('render');
    },
    setGhostPreview: (preview) => {
      ghostPreview = preview;
      renderGhostPreview();
    },
    clear: (message = 'Waiting for a ready document payload…') => {
      shell.dataset.physicsMode = 'unavailable';
      shell.dataset.activeSurface = 'none';
      structureKey = '';
      payload = null;
      ghostPreview = null;
      activeSurface = 'none';
      tileControls = null;
      freeformControls = null;
      clearSurfaceState();
      pointer.cancel();
      overflow.dispose();
      textEditing.endEditingDom();
      title.textContent = 'Canvas unavailable';
      subtitle.textContent = 'The editor is waiting for a canonical bridge payload.';
      pageMeta.textContent = message;
      const emptyState = document.createElement('div');
      emptyState.textContent = message;
      emptyState.style.cssText = 'padding: 18px; border-radius: 18px; background: rgba(226, 232, 240, 0.5); color: #334155;';
      surfaceRoot.append(emptyState);
      updateSnapshotSurfaces(engine.getSnapshot());
      overflow.emitEmpty();
    },
    destroy: () => {
      unsubscribe();
      shell.removeEventListener('keydown', onShellKeyDown);
      window.removeEventListener('resize', onWindowResize);
      pointer.detach();
      overflow.dispose();
      textEditing.endEditingDom();
      rootElement.innerHTML = '';
    },
  };
}
