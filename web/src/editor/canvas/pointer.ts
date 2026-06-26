import type { DocumentEditorEngine, FrameBox } from '../engine';

type SingleDragState = {
  kind: 'single';
  pointerId: number;
  frameId: string;
  originBox: FrameBox;
  startX: number;
  startY: number;
};

type GroupDragState = {
  kind: 'group';
  pointerId: number;
  groupId: string;
  members: Array<{ id: string; originBox: FrameBox }>;
  startX: number;
  startY: number;
};

type ResizeDragState = {
  kind: 'resize';
  pointerId: number;
  frameId: string;
  originBox: FrameBox;
  startX: number;
  startY: number;
};

const MIN_FRAME_SIZE = 8;

type DragState = SingleDragState | GroupDragState | ResizeDragState;

export type PointerController = {
  beginFrameDrag: (
    event: PointerEvent,
    frame: { id: string; blockId: string },
    originBox: FrameBox,
    handle: HTMLElement,
  ) => void;
  beginGroupDrag: (
    event: PointerEvent,
    groupId: string,
    members: Array<{ id: string; originBox: FrameBox }>,
    handle: HTMLElement,
  ) => void;
  beginFrameResize: (
    event: PointerEvent,
    frame: { id: string; blockId: string },
    originBox: FrameBox,
    handle: HTMLElement,
  ) => void;
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
  onGroupDragSettled: (groupId: string, memberIds: string[], dx: number, dy: number) => void;
  // Canvas zoom factor. Screen-pixel pointer deltas divide by this to recover
  // page-pixel deltas; at the default 100% zoom the division is a no-op.
  getScale?: () => number;
}): PointerController {
  const { engine, rootElement, onDragStart, onDragSettled, onGroupDragSettled } = deps;
  let dragState: DragState | null = null;
  let nudgeCommitTimer: ReturnType<typeof setTimeout> | null = null;

  const onPointerMove = (event: PointerEvent) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const scale = deps.getScale?.() ?? 1;
    const deltaX = (event.clientX - dragState.startX) / scale;
    const deltaY = (event.clientY - dragState.startY) / scale;

    if (dragState.kind === 'single') {
      engine.updateFrameBox(dragState.frameId, {
        ...dragState.originBox,
        x: Math.round(dragState.originBox.x + deltaX),
        y: Math.round(dragState.originBox.y + deltaY),
      });
      return;
    }

    if (dragState.kind === 'resize') {
      engine.updateFrameBox(dragState.frameId, {
        ...dragState.originBox,
        width: Math.max(MIN_FRAME_SIZE, Math.round(dragState.originBox.width + deltaX)),
        height: Math.max(MIN_FRAME_SIZE, Math.round(dragState.originBox.height + deltaY)),
      });
      return;
    }

    for (const member of dragState.members) {
      engine.updateFrameBox(member.id, {
        ...member.originBox,
        x: Math.round(member.originBox.x + deltaX),
        y: Math.round(member.originBox.y + deltaY),
      });
    }
  };

  const settleDrag = (event: PointerEvent, reason: 'pointerup' | 'pointercancel') => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const activeDrag = dragState;
    dragState = null;

    if (activeDrag.kind === 'single' || activeDrag.kind === 'resize') {
      void engine.commitFrameMove(activeDrag.frameId, reason).finally(() => {
        onDragSettled();
      });
      const handle = rootElement.querySelector(
        `[data-testid="frame-handle-${activeDrag.frameId}"]`,
      ) as HTMLElement | null;
      if (handle) {
        handle.style.cursor = 'grab';
      }
      return;
    }

    const handle = rootElement.querySelector(
      `[data-testid="tile-group-handle-${activeDrag.groupId}"]`,
    ) as HTMLElement | null;
    if (handle) {
      handle.style.cursor = 'grab';
    }
    const scale = deps.getScale?.() ?? 1;
    const dx = Math.round((event.clientX - activeDrag.startX) / scale);
    const dy = Math.round((event.clientY - activeDrag.startY) / scale);
    onGroupDragSettled(
      activeDrag.groupId,
      activeDrag.members.map((member) => member.id),
      dx,
      dy,
    );
  };

  const onPointerUp = (event: PointerEvent) => settleDrag(event, 'pointerup');
  const onPointerCancel = (event: PointerEvent) => settleDrag(event, 'pointercancel');

  return {
    beginFrameDrag: (event, frame, originBox, handle) => {
      dragState = {
        kind: 'single',
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
    beginGroupDrag: (event, groupId, members, handle) => {
      dragState = {
        kind: 'group',
        pointerId: event.pointerId,
        groupId,
        members,
        startX: event.clientX,
        startY: event.clientY,
      };
      handle.setPointerCapture(event.pointerId);
      handle.style.cursor = 'grabbing';
    },
    beginFrameResize: (event, frame, originBox, handle) => {
      dragState = {
        kind: 'resize',
        pointerId: event.pointerId,
        frameId: frame.id,
        originBox,
        startX: event.clientX,
        startY: event.clientY,
      };
      engine.selectFrame(frame.id);
      handle.setPointerCapture(event.pointerId);
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
