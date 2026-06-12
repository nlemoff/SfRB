import type { ReadyBridgePayload } from '../../bridge-client';
import { createGhostPreviewLayer, type GhostPreviewLayer } from '../../ui/GhostPreview';
import type { DocumentEditorEngine, DocumentEditorSnapshot } from '../engine';
import type { PointerController } from './pointer';
import type { EditableInteractionBinder } from './flow-surface';
import { designFrameBaseStyles, designPageStyles } from './styles';
import { lineClampText } from './text-editing';

export type TileSurfaceController = {
  syncToolbar: (snapshot: DocumentEditorSnapshot) => void;
};

export function setFrameElementPosition(frameElement: HTMLElement, box: { x: number; y: number; width: number; height: number }): void {
  frameElement.style.left = `${box.x}px`;
  frameElement.style.top = `${box.y}px`;
  frameElement.style.width = `${box.width}px`;
  frameElement.style.height = `${box.height}px`;
  frameElement.dataset.frameX = String(box.x);
  frameElement.dataset.frameY = String(box.y);
  frameElement.dataset.frameWidth = String(box.width);
  frameElement.dataset.frameHeight = String(box.height);
}

export function setTileActionNote(rootElement: HTMLElement, message: string): void {
  const note = rootElement.querySelector('#tile-action-note');
  if (note instanceof HTMLElement) {
    note.textContent = message;
  }
}

function uniqueId(base: string, taken: Set<string>): string {
  let candidate = base;
  while (taken.has(candidate)) {
    candidate = `${candidate}X`;
  }
  taken.add(candidate);
  return candidate;
}

function splittableLines(text: string | null): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const toolbarButtonStyles = [
  'padding: 7px 12px',
  'border-radius: 999px',
  'border: 1px solid #cbd5e1',
  'background: #ffffff',
  'color: #0f172a',
  'font: inherit',
  'font-size: 0.84rem',
  'cursor: pointer',
].join('; ');

// The tile surface renders canonical page geometry with draggable fixed
// frames plus the split/group/lock toolbar: the default lens for design
// workspaces.
export function renderTileSurface(deps: {
  engine: DocumentEditorEngine;
  surfaceRoot: HTMLElement;
  frameElements: Map<string, HTMLElement>;
  pageCanvasElements: Map<string, HTMLElement>;
  ghostLayers: Map<string, GhostPreviewLayer>;
  pointer: PointerController;
  bindEditableInteractions: EditableInteractionBinder;
  payload: ReadyBridgePayload;
}): TileSurfaceController {
  const { engine, surfaceRoot, frameElements, pageCanvasElements, ghostLayers, pointer, bindEditableInteractions, payload } = deps;

  const groups = payload.document.layout.frameGroups;
  const groupByFrameId = new Map<string, (typeof groups)[number]>();
  for (const group of groups) {
    for (const frameId of group.frameIds) {
      groupByFrameId.set(frameId, group);
    }
  }

  // --- Toolbar ---
  const toolbar = document.createElement('div');
  toolbar.id = 'tile-toolbar';
  toolbar.dataset.testid = 'tile-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Tile actions');
  toolbar.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; align-items: center;';

  const createToolbarButton = (id: string, label: string): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.dataset.testid = id;
    button.textContent = label;
    button.style.cssText = toolbarButtonStyles;
    button.disabled = true;
    toolbar.append(button);
    return button;
  };

  const splitButton = createToolbarButton('tile-split', 'Split lines');
  const groupButton = createToolbarButton('tile-group', 'Group');
  const lockButton = createToolbarButton('tile-lock', 'Lock');
  const ungroupButton = createToolbarButton('tile-ungroup', 'Ungroup');

  const note = document.createElement('div');
  note.id = 'tile-action-note';
  note.dataset.testid = 'tile-action-note';
  note.setAttribute('role', 'status');
  note.style.cssText = 'color: #475569; font-size: 0.84rem; line-height: 1.4;';
  note.textContent = 'Select a tile to split it, or shift-click tiles to group them.';
  toolbar.append(note);

  surfaceRoot.append(toolbar);

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

  const selectionMembers = (snapshot: DocumentEditorSnapshot): string[] => {
    if (!snapshot.selectedFrameId) {
      return [];
    }
    return [snapshot.selectedFrameId, ...snapshot.multiSelectedFrameIds];
  };

  splitButton.addEventListener('click', () => {
    const snapshot = engine.getSnapshot();
    const frameId = snapshot.selectedFrameId;
    const frame = payload.document.layout.frames.find((entry) => entry.id === frameId);
    if (!frameId || !frame) {
      return;
    }

    const lines = splittableLines(engine.getDisplayText(frame.blockId) ?? engine.getBlockText(frame.blockId));
    if (lines.length < 2) {
      setNote('Splitting needs at least two non-empty lines in the tile.');
      return;
    }

    const takenBlockIds = new Set(payload.document.semantic.blocks.map((block) => block.id));
    const takenFrameIds = new Set(payload.document.layout.frames.map((entry) => entry.id));
    const originBox = engine.getFrameBox(frameId) ?? frame.box;
    const sliceHeight = Math.max(8, Math.floor(originBox.height / lines.length));

    const segments = lines.map((line, index) => ({
      id: uniqueId(`${frame.blockId}Part${index + 1}`, takenBlockIds),
      text: line,
    }));
    const frames = lines.map((_line, index) => ({
      id: uniqueId(`${frameId}Part${index + 1}`, takenFrameIds),
      box: {
        x: originBox.x,
        y: originBox.y + index * sliceHeight,
        width: originBox.width,
        height: index === lines.length - 1 ? Math.max(8, originBox.height - sliceHeight * (lines.length - 1)) : sliceHeight,
      },
    }));

    void dispatchWithNote(
      { op: 'split-block', blockId: frame.blockId, segments, frames },
      `Split ${frame.blockId} into ${lines.length} tiles.`,
    );
  });

  groupButton.addEventListener('click', () => {
    const members = selectionMembers(engine.getSnapshot());
    if (members.length < 2) {
      setNote('Shift-click at least one more tile before grouping.');
      return;
    }

    const takenGroupIds = new Set(groups.map((group) => group.id));
    let index = 1;
    while (takenGroupIds.has(`tileGroup${index}`)) {
      index += 1;
    }

    void dispatchWithNote(
      { op: 'group-frames', groupId: `tileGroup${index}`, frameIds: members, locked: false },
      `Grouped ${members.length} tiles as tileGroup${index}.`,
    );
  });

  lockButton.addEventListener('click', () => {
    const snapshot = engine.getSnapshot();
    const group = snapshot.selectedFrameId ? groupByFrameId.get(snapshot.selectedFrameId) : undefined;
    if (!group) {
      return;
    }

    void dispatchWithNote(
      { op: 'set-group-locked', groupId: group.id, locked: !group.locked },
      `${group.locked ? 'Unlocked' : 'Locked'} ${group.id}.`,
    );
  });

  ungroupButton.addEventListener('click', () => {
    const snapshot = engine.getSnapshot();
    const group = snapshot.selectedFrameId ? groupByFrameId.get(snapshot.selectedFrameId) : undefined;
    if (!group) {
      return;
    }

    void dispatchWithNote({ op: 'ungroup-frames', groupId: group.id }, `Ungrouped ${group.id}.`);
  });

  // --- Pages and frames ---
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
      const group = groupByFrameId.get(frame.id);
      const article = document.createElement('article');
      article.dataset.frameId = frame.id;
      article.dataset.blockId = frame.blockId;
      article.dataset.testid = `editor-frame-${frame.id}`;
      if (group) {
        article.dataset.groupId = group.id;
        article.dataset.groupLocked = String(group.locked);
      }
      article.dataset.placement = frame.placement;
      article.tabIndex = 0;
      article.setAttribute('aria-label', `${block?.kind ?? 'frame'}: ${(block?.text ?? frame.id).slice(0, 40)}`);
      article.style.cssText = designFrameBaseStyles;
      setFrameElementPosition(article, engine.getFrameBox(frame.id) ?? frame.box);
      article.dataset.frameZIndex = String(frame.zIndex);
      article.style.zIndex = String(frame.zIndex);

      const handle = document.createElement('button');
      handle.type = 'button';
      handle.dataset.testid = `frame-handle-${frame.id}`;
      handle.textContent = '\u2059';
      handle.style.cssText = [
        'position: absolute',
        'top: 5px',
        'right: 5px',
        'width: 16px',
        'height: 16px',
        'padding: 0',
        'border-radius: 6px',
        'border: 1px solid rgba(148, 163, 184, 0.5)',
        'background: rgba(255, 255, 255, 0.9)',
        'color: #64748b',
        'display: grid',
        'place-items: center',
        'line-height: 1',
        'font-size: 9px',
        'cursor: grab',
      ].join('; ');
      handle.setAttribute('aria-label', `Drag frame ${frame.id}`);
      handle.title = `Drag ${frame.id}`;

      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const currentGroup = groupByFrameId.get(frame.id);
        if (currentGroup?.locked) {
          engine.selectFrame(frame.id);
          setNote(`Frame "${frame.id}" is locked in group "${currentGroup.id}" — drag the group handle or unlock it.`);
          return;
        }

        if (frame.placement === 'free') {
          engine.selectFrame(frame.id);
          setNote(`Frame "${frame.id}" keeps its freeform placement — edit it in the freeform lens or rejoin the layout.`);
          return;
        }

        const originBox = engine.getFrameBox(frame.id) ?? frame.box;
        pointer.beginFrameDrag(event, { id: frame.id, blockId: frame.blockId }, originBox, handle);
      });

      const blockBody = document.createElement('div');
      blockBody.dataset.role = 'block-body';
      blockBody.id = `editor-block-text-${frame.blockId}`;
      blockBody.dataset.testid = `editor-block-text-${frame.blockId}`;
      blockBody.style.cssText = [
        'white-space: pre-wrap',
        'line-height: 1.55',
        'color: #0f172a',
        'overflow: hidden',
        'height: 100%',
      ].join('; ');
      if (block?.kind === 'divider') {
        blockBody.style.borderTop = '1px solid currentColor';
        blockBody.textContent = '';
      } else {
        blockBody.textContent = lineClampText(engine.getDisplayText(frame.blockId) ?? block?.text ?? '');
      }

      bindEditableInteractions(article, frame.blockId, frame.id);
      blockBody.addEventListener('click', (event) => {
        event.stopPropagation();
        if (event.shiftKey) {
          engine.toggleFrameInSelection(frame.id);
          return;
        }
        engine.selectFrame(frame.id);
      });
      blockBody.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        engine.selectFrame(frame.id);
        engine.startEditing(frame.blockId);
      });

      article.append(handle, blockBody);
      canvas.append(article);
      frameElements.set(frame.id, article);
    });

    // --- Group badges ---
    const pageGroups = groups.filter((group) => group.pageId === page.id);
    for (const group of pageGroups) {
      const memberBoxes = group.frameIds
        .map((frameId) => engine.getFrameBox(frameId))
        .filter((box): box is NonNullable<typeof box> => box !== null);
      if (memberBoxes.length === 0) {
        continue;
      }

      const minX = Math.min(...memberBoxes.map((box) => box.x));
      const minY = Math.min(...memberBoxes.map((box) => box.y));

      const badge = document.createElement('div');
      badge.dataset.testid = `tile-group-badge-${group.id}`;
      badge.dataset.groupId = group.id;
      badge.dataset.groupLocked = String(group.locked);
      badge.style.cssText = [
        'position: absolute',
        `left: ${minX}px`,
        `top: ${Math.max(0, minY - 26)}px`,
        'z-index: 500',
        'display: inline-flex',
        'align-items: center',
        'gap: 6px',
        'padding: 3px 8px',
        'border-radius: 999px',
        'background: #1d4ed8',
        'color: #eff6ff',
        'font-size: 0.66rem',
        'letter-spacing: 0.08em',
        'text-transform: uppercase',
      ].join('; ');

      const label = document.createElement('span');
      label.textContent = `${group.id}${group.locked ? ' · locked' : ''}`;
      badge.append(label);

      if (group.locked) {
        const groupHandle = document.createElement('button');
        groupHandle.type = 'button';
        groupHandle.dataset.testid = `tile-group-handle-${group.id}`;
        groupHandle.setAttribute('aria-label', `Drag group ${group.id}`);
        groupHandle.title = `Drag ${group.id}`;
        groupHandle.textContent = '⠿';
        groupHandle.style.cssText = [
          'border: none',
          'border-radius: 999px',
          'width: 18px',
          'height: 18px',
          'display: inline-grid',
          'place-items: center',
          'background: #eff6ff',
          'color: #1d4ed8',
          'cursor: grab',
          'font-size: 0.7rem',
        ].join('; ');

        groupHandle.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const members = group.frameIds
            .map((frameId) => {
              const box = engine.getFrameBox(frameId);
              return box ? { id: frameId, originBox: box } : null;
            })
            .filter((member): member is NonNullable<typeof member> => member !== null);
          pointer.beginGroupDrag(event, group.id, members, groupHandle);
        });

        badge.append(groupHandle);
      }

      canvas.append(badge);
    }

    const ghostLayer = createGhostPreviewLayer();
    ghostLayers.set(page.id, ghostLayer);
    canvas.append(ghostLayer.element);
    pageCanvasElements.set(page.id, canvas);

    pageShell.append(pageHeading, canvas);
    surfaceRoot.append(pageShell);
  });

  const syncToolbar = (snapshot: DocumentEditorSnapshot) => {
    const selectedFrame = snapshot.selectedFrameId
      ? payload.document.layout.frames.find((frame) => frame.id === snapshot.selectedFrameId)
      : undefined;
    const primaryGroup = snapshot.selectedFrameId ? groupByFrameId.get(snapshot.selectedFrameId) : undefined;
    const members = selectionMembers(snapshot);

    const lines = selectedFrame
      ? splittableLines(engine.getDisplayText(selectedFrame.blockId) ?? engine.getBlockText(selectedFrame.blockId))
      : [];

    splitButton.disabled = !selectedFrame || members.length > 1 || lines.length < 2;
    groupButton.disabled = members.length < 2;
    lockButton.disabled = !primaryGroup;
    lockButton.textContent = primaryGroup?.locked ? 'Unlock' : 'Lock';
    ungroupButton.disabled = !primaryGroup;
  };

  syncToolbar(engine.getSnapshot());

  return { syncToolbar };
}
