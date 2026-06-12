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
  designFrameBaseStyles,
  documentBlockStyles,
  editingDesignFrameStyles,
  editingDocumentBlockStyles,
  pageStyles,
  selectedDesignFrameStyles,
  selectedDocumentBlockStyles,
} from './styles';
import { motionOK, motion } from '../../ui/tokens';
import { createStatusCell } from '../../ui/status-cell';

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

  // --- Canvas bar: document identity + zoom, never scaled ---
  const bar = document.createElement('header');
  bar.className = 'sfrb-canvas-bar';

  const headingGroup = document.createElement('div');

  const title = document.createElement('h2');
  title.id = 'document-title';
  title.dataset.testid = 'document-title';

  const subtitle = document.createElement('p');
  subtitle.style.cssText = 'margin: 2px 0 0; max-width: 64ch; color: var(--sfrb-ink-faint); font-size: 12px; line-height: 1.4;';
  headingGroup.append(title, subtitle);

  const pageMeta = document.createElement('div');
  pageMeta.id = 'editor-page-metrics';
  pageMeta.dataset.testid = 'editor-page-metrics';
  pageMeta.className = 'sfrb-canvas-meta';

  const zoomControl = document.createElement('div');
  zoomControl.id = 'canvas-zoom-control';
  zoomControl.dataset.testid = 'canvas-zoom-control';
  zoomControl.className = 'sfrb-zoom-control';
  zoomControl.setAttribute('role', 'group');
  zoomControl.setAttribute('aria-label', 'Canvas zoom');

  bar.append(headingGroup, pageMeta, zoomControl);

  // --- Status strip: frozen HUD value nodes as compact chips. Refs are kept
  // because the strip syncs on every engine snapshot (a drag-time hot path).
  const statusBar = document.createElement('div');
  statusBar.className = 'sfrb-canvas-statusbar';
  const hudCells = {
    mode: createStatusCell('Mode', 'editor-affordance-mode', 'editor-affordance-mode'),
    block: createStatusCell('Block', 'editor-selected-block', 'editor-selected-block'),
    frame: createStatusCell('Frame', 'editor-selected-frame', 'editor-selected-frame'),
    drag: createStatusCell('Drag', 'editor-drag-affordance-status', 'editor-drag-affordance-status'),
    box: createStatusCell('Box', 'editor-selected-frame-box', 'editor-selected-frame-box'),
  };
  statusBar.append(hudCells.mode.cell, hudCells.block.cell, hudCells.frame.cell, hudCells.drag.cell, hudCells.box.cell);

  // --- Controls host: tile toolbar / freeform HUD live outside the page so
  // they are never clipped by page bounds nor scaled by zoom ---
  const controlsHost = document.createElement('div');
  controlsHost.className = 'sfrb-canvas-controls';

  // --- Desk viewport and zoom scaler around the page ---
  const viewport = document.createElement('div');
  viewport.className = 'sfrb-canvas-viewport';

  const scaler = document.createElement('div');
  scaler.id = 'editor-canvas-scaler';
  scaler.dataset.canvasScale = '1';
  scaler.style.cssText = 'width: fit-content; transform-origin: top left;';

  const pageRoot = document.createElement('div');
  pageRoot.id = 'editor-document-page';
  pageRoot.dataset.testid = 'editor-document-page';
  pageRoot.style.cssText = pageStyles;

  const surfaceRoot = document.createElement('div');
  surfaceRoot.id = 'editor-surface-root';
  surfaceRoot.dataset.testid = 'editor-surface-root';
  surfaceRoot.style.cssText = 'display: grid; gap: 22px;';

  pageRoot.append(surfaceRoot);
  scaler.append(pageRoot);
  viewport.append(scaler);
  shell.append(bar, statusBar, controlsHost, viewport);
  rootElement.append(shell);

  // --- Zoom ---
  // Default is 100%, where the scaler carries no transform property at all:
  // pointer drags and bounding boxes behave bit-identically to an unscaled
  // canvas. Non-1 zooms reserve the scaled layout size explicitly.
  let zoomMode: 'fit' | 0.5 | 1 = 1;

  const applyZoom = () => {
    scaler.style.removeProperty('transform');
    scaler.style.removeProperty('width');
    scaler.style.removeProperty('height');

    // Natural size is measured at most once per call, and not at all on the
    // default 100% path (renderPayload calls this on every rebuild).
    let naturalWidth = 0;
    let naturalHeight = 0;
    const measureNatural = () => {
      if (naturalWidth === 0) {
        naturalWidth = scaler.scrollWidth;
        naturalHeight = scaler.scrollHeight;
      }
    };

    let scale = 1;
    if (zoomMode === 'fit') {
      measureNatural();
      const available = viewport.clientWidth - 48;
      if (naturalWidth > 0 && available > 0) {
        scale = Math.min(1.5, Math.max(0.25, available / naturalWidth));
        scale = Math.round(scale * 100) / 100;
      }
      if (Math.abs(scale - 1) < 0.02) {
        scale = 1;
      }
    } else {
      scale = zoomMode;
    }

    scaler.dataset.canvasScale = String(scale);
    if (scale !== 1) {
      measureNatural();
      scaler.style.transform = `scale(${scale})`;
      scaler.style.width = `${Math.ceil(naturalWidth * scale)}px`;
      scaler.style.height = `${Math.ceil(naturalHeight * scale)}px`;
    }

    for (const button of Array.from(zoomControl.querySelectorAll<HTMLButtonElement>('button'))) {
      const isActive = button.dataset.zoomMode === String(zoomMode);
      button.dataset.active = String(isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }
  };

  const zoomOptions: Array<{ id: string; label: string; mode: 'fit' | 0.5 | 1 }> = [
    { id: 'canvas-zoom-50', label: '50%', mode: 0.5 },
    { id: 'canvas-zoom-100', label: '100%', mode: 1 },
    { id: 'canvas-zoom-fit', label: 'Fit', mode: 'fit' },
  ];
  for (const option of zoomOptions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = option.id;
    button.dataset.testid = option.id;
    button.dataset.zoomMode = String(option.mode);
    button.className = 'sfrb-zoom-btn';
    button.textContent = option.label;
    button.addEventListener('click', () => {
      zoomMode = option.mode;
      applyZoom();
    });
    zoomControl.append(button);
  }
  applyZoom();

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
    getScale: () => {
      const scale = Number.parseFloat(scaler.dataset.canvasScale ?? '1');
      return Number.isFinite(scale) && scale > 0 ? scale : 1;
    },
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
    hudCells.mode.value.textContent = snapshot.interactionMode;

    hudCells.block.value.textContent = snapshot.selectedBlockId ?? 'None';
    hudCells.block.value.dataset.selectedBlockId = snapshot.selectedBlockId ?? '';
    hudCells.block.cell.dataset.empty = String(snapshot.selectedBlockId === null);

    hudCells.frame.value.textContent = snapshot.selectedFrameId ?? 'None';
    hudCells.frame.value.dataset.selectedFrameId = snapshot.selectedFrameId ?? '';
    hudCells.frame.cell.dataset.empty = String(snapshot.selectedFrameId === null);

    const affordances = snapshot.interactionMode === 'design' && snapshot.activeLens !== 'text' ? 'present' : 'absent';
    hudCells.drag.value.textContent = affordances;
    hudCells.drag.value.dataset.dragAffordances = affordances;
    hudCells.drag.cell.dataset.empty = String(affordances === 'absent');

    const box = snapshot.selectedFrameId ? engine.getFrameBox(snapshot.selectedFrameId) : null;
    hudCells.box.value.textContent = formatFrameBox(box);
    hudCells.box.value.dataset.frameBox = box ? JSON.stringify(box) : '';
    hudCells.box.cell.dataset.empty = String(box === null);
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
        frameElement.style.borderColor = isSelected ? 'var(--sfrb-accent)' : 'rgba(130, 148, 165, 0.4)';
        frameElement.style.boxShadow = isSelected ? '0 0 0 3px var(--sfrb-accent-soft)' : 'none';
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
            ? `${designFrameBaseStyles}; border-color: var(--sfrb-accent); border-style: dashed;`
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
    controlsHost.innerHTML = '';
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
          .map((frame) => ({ id: frame.id, pageId: frame.pageId, blockId: frame.blockId, zIndex: frame.zIndex, placement: frame.placement }))
          .sort((left, right) => left.zIndex - right.zIndex),
        // Group membership, lock state, and placement drive badges, handles,
        // and frame datasets, so those changes must rebuild the surface
        // (box-only moves intentionally do not).
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
        subtitle.textContent = 'Drag handles to move frames; double-click a frame to edit its text.';
        tileControls = renderTileSurface({
          engine,
          surfaceRoot,
          controlsHost,
          frameElements,
          pageCanvasElements,
          ghostLayers,
          pointer,
          bindEditableInteractions,
          payload: nextPayload,
        });
      } else if (nextSurface === 'freeform') {
        subtitle.textContent = "Move and resize anything directly. When you leave this lens, you'll choose how placements rejoin the layout.";
        freeformControls = renderFreeformSurface({
          engine,
          surfaceRoot,
          controlsHost,
          frameElements,
          pageCanvasElements,
          ghostLayers,
          pointer,
          payload: nextPayload,
        });
      } else {
        subtitle.textContent = 'Click a block to edit its words. Changes save automatically.';
        renderFlowSurface({
          engine,
          surfaceRoot,
          blockElements,
          bindEditableInteractions,
          payload: nextPayload,
        });
      }

      applyZoom();

      if (motionOK()) {
        surfaceRoot.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 160,
          easing: motion.ease,
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

    const framePlacement = engine.getPayload()?.document.layout.frames.find((frame) => frame.id === frameId)?.placement;
    if (activeSurface === 'tile' && framePlacement === 'free') {
      engine.selectFrame(frameId);
      setTileActionNote(
        rootElement,
        `Frame "${frameId}" keeps its freeform placement — edit it in the freeform lens or rejoin the layout.`,
      );
      return;
    }

    const step = event.shiftKey ? 10 : 1;
    engine.selectFrame(frameId);
    pointer.nudgeFrame(frameId, delta[0] * step, delta[1] * step);
  };
  shell.addEventListener('keydown', onShellKeyDown);

  const onWindowResize = () => {
    if (zoomMode === 'fit') {
      applyZoom();
    }
    overflow.schedule('resize');
  };
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
      emptyState.style.cssText = [
        'padding: 28px 32px',
        'border-radius: var(--sfrb-radius-md)',
        'border: 1px dashed var(--sfrb-line)',
        'background: var(--sfrb-panel)',
        'color: var(--sfrb-ink-soft)',
        'font-family: var(--sfrb-font-sans)',
        'font-size: 13px',
        'max-width: 420px',
        'text-align: center',
      ].join('; ');
      surfaceRoot.append(emptyState);
      applyZoom();
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
