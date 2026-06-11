import type { DocumentEditorEngine, FrameBox } from '../engine';

type DragState = {
  pointerId: number;
  frameId: string;
  originBox: FrameBox;
  startX: number;
  startY: number;
};

export type PointerController = {
  beginFrameDrag: (event: PointerEvent, frame: { id: string; blockId: string }, originBox: FrameBox, handle: HTMLElement) => void;
  nudgeFrame: (frameId: string, dx: number, dy: number) => void;
  isDragging: () => boolean;
  attach: () => void;
  detach: () => void;
  cancel: () => void;
};

export function createPointerController(deps: {
  engine: DocumentEditorEngine;
  rootElement: HTMLElement;
  onDragStart: (frameId: string, blockId: string) => void;
  onDragSettled: () => void;
}): PointerController {
  const { engine, rootElement, onDragStart, onDragSettled } = deps;
  let dragState: DragState | null = null;
  let nudgeCommitTimer: ReturnType<typeof setTimeout> | null = null;

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
    void engine.commitFrameMove(activeDrag.frameId, reason).finally(() => {
      onDragSettled();
    });
  };

  const onPointerUp = (event: PointerEvent) => settleDrag(event, 'pointerup');
  const onPointerCancel = (event: PointerEvent) => settleDrag(event, 'pointercancel');

  return {
    beginFrameDrag: (event, frame, originBox, handle) => {
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
      onDragStart(frame.id, frame.blockId);
    },
    nudgeFrame: (frameId, dx, dy) => {
      const currentBox = engine.getFrameBox(frameId);
      if (!currentBox) {
        return;
      }

      engine.updateFrameBox(frameId, {
        ...currentBox,
        x: Math.round(currentBox.x + dx),
        y: Math.round(currentBox.y + dy),
      });

      // Nudges reuse the drag-commit path, debounced so arrow-key bursts
      // persist as one structured operation.
      if (nudgeCommitTimer) {
        clearTimeout(nudgeCommitTimer);
      }
      nudgeCommitTimer = setTimeout(() => {
        nudgeCommitTimer = null;
        void engine.commitFrameMove(frameId, 'pointerup').finally(() => {
          onDragSettled();
        });
      }, 180);
    },
    isDragging: () => dragState !== null,
    attach: () => {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
    },
    detach: () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      if (nudgeCommitTimer) {
        clearTimeout(nudgeCommitTimer);
        nudgeCommitTimer = null;
      }
    },
    cancel: () => {
      dragState = null;
    },
  };
}
