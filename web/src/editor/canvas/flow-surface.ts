import type { ReadyBridgePayload } from '../../bridge-client';
import type { DocumentEditorEngine } from '../engine';
import { documentBlockStyles } from './styles';
import { lineClampText } from './text-editing';

export type EditableInteractionBinder = (element: HTMLElement, blockId: string, frameId?: string) => void;

// The flow surface renders semantic sections in flow order: the document
// physics editor, and the text lens inside design workspaces.
export function renderFlowSurface(deps: {
  engine: DocumentEditorEngine;
  surfaceRoot: HTMLElement;
  blockElements: Map<string, HTMLElement>;
  bindEditableInteractions: EditableInteractionBinder;
  payload: ReadyBridgePayload;
}): void {
  const { engine, surfaceRoot, blockElements, bindEditableInteractions, payload } = deps;

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
      article.setAttribute('aria-label', `${block?.kind ?? 'block'}: ${(block?.text ?? '').slice(0, 40)}`);

      const kindLabel = document.createElement('div');
      kindLabel.textContent = `${block?.kind ?? 'missing'} · ${blockId}`;
      kindLabel.style.cssText = 'color: #475569; text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.72rem;';

      const blockBody = document.createElement('div');
      blockBody.dataset.role = 'block-body';
      blockBody.id = `editor-block-text-${blockId}`;
      blockBody.dataset.testid = `editor-block-text-${blockId}`;
      blockBody.style.cssText = 'margin-top: 10px; white-space: pre-wrap; line-height: 1.65;';
      if (block?.kind === 'divider') {
        blockBody.style.borderTop = '1px solid currentColor';
        blockBody.textContent = '';
      } else {
        blockBody.textContent = lineClampText(engine.getDisplayText(blockId) ?? block?.text ?? '');
      }

      bindEditableInteractions(article, blockId);

      article.append(kindLabel, blockBody);
      blockList.append(article);
      blockElements.set(blockId, article);
    });

    sectionElement.append(blockList);
    surfaceRoot.append(sectionElement);
  });
}
