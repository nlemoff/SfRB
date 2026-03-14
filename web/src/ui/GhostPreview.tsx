import type { FrameBox } from '../editor/engine';

export type GhostPreviewModel = {
  frameId: string;
  box: FrameBox;
  rationale: string;
  confidence: number;
};

export type GhostPreviewLayer = {
  element: HTMLDivElement;
  render: (preview: GhostPreviewModel | null) => void;
};

export function createGhostPreviewLayer(): GhostPreviewLayer {
  const element = document.createElement('div');
  element.dataset.testid = 'consultant-ghost-layer';
  element.style.cssText = 'position: absolute; inset: 0; pointer-events: none;';

  let previewElement: HTMLDivElement | null = null;

  const render = (preview: GhostPreviewModel | null) => {
    element.replaceChildren();
    previewElement = null;

    if (!preview) {
      return;
    }

    previewElement = document.createElement('div');
    previewElement.id = `consultant-ghost-preview-${preview.frameId}`;
    previewElement.dataset.testid = `consultant-ghost-preview-${preview.frameId}`;
    previewElement.dataset.frameId = preview.frameId;
    previewElement.dataset.frameX = String(preview.box.x);
    previewElement.dataset.frameY = String(preview.box.y);
    previewElement.dataset.frameWidth = String(preview.box.width);
    previewElement.dataset.frameHeight = String(preview.box.height);
    previewElement.style.cssText = [
      'position: absolute',
      `left: ${preview.box.x}px`,
      `top: ${preview.box.y}px`,
      `width: ${preview.box.width}px`,
      `height: ${preview.box.height}px`,
      'border-radius: 20px',
      'border: 2px dashed rgba(59, 130, 246, 0.92)',
      'background: linear-gradient(180deg, rgba(96, 165, 250, 0.18), rgba(59, 130, 246, 0.08))',
      'box-shadow: 0 0 0 1px rgba(191, 219, 254, 0.7), 0 18px 44px rgba(37, 99, 235, 0.22)',
      'backdrop-filter: blur(2px)',
      'display: grid',
      'align-content: start',
      'padding: 12px',
      'overflow: hidden',
    ].join('; ');

    const badge = document.createElement('div');
    badge.dataset.testid = `consultant-ghost-badge-${preview.frameId}`;
    badge.style.cssText = [
      'justify-self: start',
      'max-width: min(100%, 280px)',
      'padding: 8px 10px',
      'border-radius: 14px',
      'background: rgba(15, 23, 42, 0.82)',
      'color: #dbeafe',
      'font-size: 0.72rem',
      'line-height: 1.45',
      'letter-spacing: 0.01em',
      'box-shadow: 0 8px 24px rgba(15, 23, 42, 0.22)',
    ].join('; ');
    badge.textContent = `Ghost preview · ${Math.round(preview.confidence * 100)}% confidence · ${preview.rationale}`;

    previewElement.append(badge);
    element.append(previewElement);
  };

  return { element, render };
}
