import type { ReadyBridgePayload } from '../../bridge-client';
import { createGhostPreviewLayer, type GhostPreviewLayer } from '../../ui/GhostPreview';
import type { DocumentEditorEngine } from '../engine';
import type { PointerController } from './pointer';
import type { EditableInteractionBinder } from './flow-surface';
import { designFrameBaseStyles, designPageStyles } from './styles';
import { lineClampText } from './text-editing';

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

// The tile surface renders canonical page geometry with draggable fixed
// frames: the default lens for design workspaces.
export function renderTileSurface(deps: {
  engine: DocumentEditorEngine;
  surfaceRoot: HTMLElement;
  blockElements: Map<string, HTMLElement>;
  frameElements: Map<string, HTMLElement>;
  pageCanvasElements: Map<string, HTMLElement>;
  ghostLayers: Map<string, GhostPreviewLayer>;
  pointer: PointerController;
  bindEditableInteractions: EditableInteractionBinder;
  payload: ReadyBridgePayload;
}): void {
  const { engine, surfaceRoot, blockElements, frameElements, pageCanvasElements, ghostLayers, pointer, bindEditableInteractions, payload } = deps;
  void blockElements;

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
      article.setAttribute('aria-label', `${block?.kind ?? 'frame'}: ${(block?.text ?? frame.id).slice(0, 40)}`);
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
        pointer.beginFrameDrag(event, { id: frame.id, blockId: frame.blockId }, originBox, handle);
      });

      const meta = document.createElement('div');
      meta.textContent = `${block?.kind ?? 'missing'} · ${frame.id} · ${frame.blockId}`;
      meta.style.cssText = 'color: #334155; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.68rem;';

      const blockBody = document.createElement('div');
      blockBody.dataset.role = 'block-body';
      blockBody.id = `editor-block-text-${frame.blockId}`;
      blockBody.dataset.testid = `editor-block-text-${frame.blockId}`;
      blockBody.style.cssText = [
        'white-space: pre-wrap',
        'line-height: 1.55',
        'color: #0f172a',
        'align-self: stretch',
        'overflow: hidden',
        'min-height: 0',
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

    const ghostLayer = createGhostPreviewLayer();
    ghostLayers.set(page.id, ghostLayer);
    canvas.append(ghostLayer.element);
    pageCanvasElements.set(page.id, canvas);

    pageShell.append(pageHeading, canvas);
    surfaceRoot.append(pageShell);
  });
}
