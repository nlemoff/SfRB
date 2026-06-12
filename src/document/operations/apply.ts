import type { FrameGroup, LayoutFrame, SemanticBlock, SemanticSection, SfrbDocument } from '../schema';
import { currentTemplateMetadata } from '../templates/registry';
import type { EditorOperation, OperationIssue } from './schema';

export class OperationApplicationError extends Error {
  readonly issues: OperationIssue[];
  readonly operationKind: EditorOperation['op'];

  constructor(operationKind: EditorOperation['op'], issues: OperationIssue[]) {
    super(
      [`Cannot apply ${operationKind}:`, ...issues.map((issue) => `- ${issue.path}: ${issue.message}`)].join('\n'),
    );

    this.name = 'OperationApplicationError';
    this.operationKind = operationKind;
    this.issues = issues;
  }
}

function reject(operationKind: EditorOperation['op'], path: string, message: string): never {
  throw new OperationApplicationError(operationKind, [{ path, message }]);
}

function requireBlock(document: SfrbDocument, operationKind: EditorOperation['op'], blockId: string): SemanticBlock {
  const block = document.semantic.blocks.find((candidate) => candidate.id === blockId);
  if (!block) {
    reject(operationKind, 'blockId', `Document does not contain semantic block "${blockId}"`);
  }
  return block;
}

function requireFrame(document: SfrbDocument, operationKind: EditorOperation['op'], frameId: string, path = 'frameId'): LayoutFrame {
  const frame = document.layout.frames.find((candidate) => candidate.id === frameId);
  if (!frame) {
    reject(operationKind, path, `Document does not contain layout frame "${frameId}"`);
  }
  return frame;
}

function requireGroup(document: SfrbDocument, operationKind: EditorOperation['op'], groupId: string): FrameGroup {
  const group = document.layout.frameGroups.find((candidate) => candidate.id === groupId);
  if (!group) {
    reject(operationKind, 'groupId', `Document does not contain frame group "${groupId}"`);
  }
  return group;
}

function findGroupForFrame(document: SfrbDocument, frameId: string): FrameGroup | undefined {
  return document.layout.frameGroups.find((group) => group.frameIds.includes(frameId));
}

function nextZIndexForPage(document: SfrbDocument, pageId: string): number {
  const pageFrames = document.layout.frames.filter((frame) => frame.pageId === pageId);
  if (pageFrames.length === 0) {
    return 0;
  }
  return Math.max(...pageFrames.map((frame) => frame.zIndex)) + 1;
}

function applySetTitle(document: SfrbDocument, operation: Extract<EditorOperation, { op: 'set-title' }>): SfrbDocument {
  return {
    ...document,
    metadata: { ...document.metadata, title: operation.title },
  };
}

function applySetSectionTitle(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'set-section-title' }>,
): SfrbDocument {
  const exists = document.semantic.sections.some((section) => section.id === operation.sectionId);
  if (!exists) {
    reject(operation.op, 'sectionId', `Document does not contain semantic section "${operation.sectionId}"`);
  }

  return {
    ...document,
    semantic: {
      ...document.semantic,
      sections: document.semantic.sections.map((section) =>
        section.id === operation.sectionId ? { ...section, title: operation.title } : section,
      ),
    },
  };
}

function applySetTemplate(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'set-template' }>,
): SfrbDocument {
  return {
    ...document,
    metadata: { ...document.metadata, template: currentTemplateMetadata(operation.templateId) },
  };
}

function applySetBlockText(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'set-block-text' }>,
): SfrbDocument {
  requireBlock(document, operation.op, operation.blockId);

  return {
    ...document,
    semantic: {
      ...document.semantic,
      blocks: document.semantic.blocks.map((block) =>
        block.id === operation.blockId ? { ...block, text: operation.text } : block,
      ),
    },
  };
}

function applyInsertBlock(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'insert-block' }>,
): SfrbDocument {
  const section = document.semantic.sections.find((candidate) => candidate.id === operation.sectionId);
  if (!section) {
    reject(operation.op, 'sectionId', `Document does not contain semantic section "${operation.sectionId}"`);
  }

  if (document.semantic.blocks.some((block) => block.id === operation.block.id)) {
    reject(operation.op, 'block.id', `Semantic block id "${operation.block.id}" is already in use`);
  }

  const index = operation.index ?? section.blockIds.length;
  if (index > section.blockIds.length) {
    reject(operation.op, 'index', `Index ${index} is out of range for section "${section.id}" (${section.blockIds.length} blocks)`);
  }

  let frames = document.layout.frames;
  if (operation.frame) {
    if (document.layout.frames.some((frame) => frame.id === operation.frame!.id)) {
      reject(operation.op, 'frame.id', `Layout frame id "${operation.frame.id}" is already in use`);
    }

    frames = [
      ...frames,
      {
        id: operation.frame.id,
        pageId: operation.frame.pageId,
        blockId: operation.block.id,
        box: operation.frame.box,
        zIndex: operation.frame.zIndex ?? nextZIndexForPage(document, operation.frame.pageId),
        placement: 'managed',
      },
    ];
  }

  const blockIds = [...section.blockIds];
  blockIds.splice(index, 0, operation.block.id);

  return {
    ...document,
    semantic: {
      sections: document.semantic.sections.map((candidate) =>
        candidate.id === section.id ? { ...candidate, blockIds } : candidate,
      ),
      blocks: [...document.semantic.blocks, { ...operation.block }],
    },
    layout: { ...document.layout, frames },
  };
}

function applyRemoveBlock(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'remove-block' }>,
): SfrbDocument {
  requireBlock(document, operation.op, operation.blockId);

  if (document.semantic.blocks.length <= 1) {
    reject(operation.op, 'blockId', 'Cannot remove the document’s last semantic block');
  }

  const removedFrameIds = new Set(
    document.layout.frames.filter((frame) => frame.blockId === operation.blockId).map((frame) => frame.id),
  );

  const sections: SemanticSection[] = document.semantic.sections
    .map((section) => ({ ...section, blockIds: section.blockIds.filter((id) => id !== operation.blockId) }))
    .filter((section) => section.blockIds.length > 0);

  const frameGroups = document.layout.frameGroups
    .map((group) => ({ ...group, frameIds: group.frameIds.filter((id) => !removedFrameIds.has(id)) }))
    .filter((group) => group.frameIds.length >= 2);

  return {
    ...document,
    semantic: {
      sections,
      blocks: document.semantic.blocks.filter((block) => block.id !== operation.blockId),
    },
    layout: {
      ...document.layout,
      frames: document.layout.frames.filter((frame) => !removedFrameIds.has(frame.id)),
      frameGroups,
    },
  };
}

function applySplitBlock(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'split-block' }>,
): SfrbDocument {
  const original = requireBlock(document, operation.op, operation.blockId);
  const originalFrame = document.layout.frames.find((frame) => frame.blockId === operation.blockId);

  const existingBlockIds = new Set(document.semantic.blocks.map((block) => block.id));
  operation.segments.forEach((segment, segmentIndex) => {
    if (existingBlockIds.has(segment.id)) {
      reject(operation.op, `segments.${segmentIndex}.id`, `Semantic block id "${segment.id}" is already in use`);
    }
  });

  if (originalFrame && !operation.frames) {
    reject(operation.op, 'frames', `Block "${operation.blockId}" is frame-backed; provide one frame per segment`);
  }
  if (!originalFrame && operation.frames) {
    reject(operation.op, 'frames', `Block "${operation.blockId}" has no layout frame; omit segment frames`);
  }
  if (operation.frames && operation.frames.length !== operation.segments.length) {
    reject(
      operation.op,
      'frames',
      `Segment frames (${operation.frames.length}) must match segments (${operation.segments.length})`,
    );
  }

  const existingFrameIds = new Set(document.layout.frames.map((frame) => frame.id));
  operation.frames?.forEach((frame, frameIndex) => {
    if (existingFrameIds.has(frame.id)) {
      reject(operation.op, `frames.${frameIndex}.id`, `Layout frame id "${frame.id}" is already in use`);
    }
  });

  const segmentBlocks: SemanticBlock[] = operation.segments.map((segment) => ({
    id: segment.id,
    kind: original.kind,
    text: segment.text,
    splitFrom: operation.blockId,
  }));

  const blocks = document.semantic.blocks.flatMap((block) => (block.id === operation.blockId ? segmentBlocks : [block]));
  const sections = document.semantic.sections.map((section) => ({
    ...section,
    blockIds: section.blockIds.flatMap((id) => (id === operation.blockId ? operation.segments.map((s) => s.id) : [id])),
  }));

  let frames = document.layout.frames;
  let frameGroups = document.layout.frameGroups;
  if (originalFrame && operation.frames) {
    const segmentFrames: LayoutFrame[] = operation.frames.map((frame, frameIndex) => ({
      id: frame.id,
      pageId: originalFrame.pageId,
      blockId: operation.segments[frameIndex].id,
      box: frame.box,
      zIndex: frame.zIndex ?? originalFrame.zIndex,
      placement: originalFrame.placement,
    }));

    frames = [...frames.filter((frame) => frame.id !== originalFrame.id), ...segmentFrames];
    frameGroups = frameGroups
      .map((group) => ({ ...group, frameIds: group.frameIds.filter((id) => id !== originalFrame.id) }))
      .filter((group) => group.frameIds.length >= 2);
  }

  return {
    ...document,
    semantic: { sections, blocks },
    layout: { ...document.layout, frames, frameGroups },
  };
}

function applySetFrameBox(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'set-frame-box' }>,
): SfrbDocument {
  const frame = requireFrame(document, operation.op, operation.frameId);

  const group = findGroupForFrame(document, frame.id);
  if (group?.locked) {
    reject(
      operation.op,
      'frameId',
      `Frame "${frame.id}" is a locked group member — move the group "${group.id}" or unlock it`,
    );
  }

  if (frame.placement === 'free' && operation.asFreeform !== true) {
    reject(
      operation.op,
      'frameId',
      `Frame "${frame.id}" is freeform-placed — edit it in the freeform lens or reconcile with rejoin_layout`,
    );
  }

  return {
    ...document,
    layout: {
      ...document.layout,
      frames: document.layout.frames.map((candidate) =>
        candidate.id === operation.frameId ? { ...candidate, box: operation.box } : candidate,
      ),
    },
  };
}

function applyMoveGroup(document: SfrbDocument, operation: Extract<EditorOperation, { op: 'move-group' }>): SfrbDocument {
  const group = requireGroup(document, operation.op, operation.groupId);

  if (!group.locked) {
    reject(operation.op, 'groupId', `Frame group "${group.id}" is not locked — lock it before moving it as one unit`);
  }

  const memberIds = new Set(group.frameIds);

  return {
    ...document,
    layout: {
      ...document.layout,
      frames: document.layout.frames.map((frame) =>
        memberIds.has(frame.id)
          ? { ...frame, box: { ...frame.box, x: frame.box.x + operation.dx, y: frame.box.y + operation.dy } }
          : frame,
      ),
    },
  };
}

function applyGroupFrames(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'group-frames' }>,
): SfrbDocument {
  if (document.layout.frameGroups.some((group) => group.id === operation.groupId)) {
    reject(operation.op, 'groupId', `Frame group id "${operation.groupId}" is already in use`);
  }

  const members = operation.frameIds.map((frameId, index) =>
    requireFrame(document, operation.op, frameId, `frameIds.${index}`),
  );

  const pageIds = new Set(members.map((frame) => frame.pageId));
  if (pageIds.size > 1) {
    reject(operation.op, 'frameIds', 'Frame group members must share one page');
  }

  members.forEach((frame, index) => {
    const existingGroup = findGroupForFrame(document, frame.id);
    if (existingGroup) {
      reject(operation.op, `frameIds.${index}`, `Frame "${frame.id}" already belongs to frame group "${existingGroup.id}"`);
    }
    if (frame.placement === 'free') {
      reject(operation.op, `frameIds.${index}`, `Frame "${frame.id}" is freeform-placed — reconcile it before grouping`);
    }
  });

  return {
    ...document,
    layout: {
      ...document.layout,
      frameGroups: [
        ...document.layout.frameGroups,
        { id: operation.groupId, pageId: members[0].pageId, frameIds: [...operation.frameIds], locked: operation.locked },
      ],
    },
  };
}

function applyUngroupFrames(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'ungroup-frames' }>,
): SfrbDocument {
  requireGroup(document, operation.op, operation.groupId);

  return {
    ...document,
    layout: {
      ...document.layout,
      frameGroups: document.layout.frameGroups.filter((group) => group.id !== operation.groupId),
    },
  };
}

function applySetGroupLocked(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'set-group-locked' }>,
): SfrbDocument {
  requireGroup(document, operation.op, operation.groupId);

  return {
    ...document,
    layout: {
      ...document.layout,
      frameGroups: document.layout.frameGroups.map((group) =>
        group.id === operation.groupId ? { ...group, locked: operation.locked } : group,
      ),
    },
  };
}

function applyReconcileFreeform(
  document: SfrbDocument,
  operation: Extract<EditorOperation, { op: 'reconcile-freeform' }>,
): SfrbDocument {
  operation.frameIds.forEach((frameId, index) => {
    requireFrame(document, operation.op, frameId, `frameIds.${index}`);
  });

  const targetIds = new Set(operation.frameIds);
  const placement = operation.outcome === 'rejoin_layout' ? 'managed' : 'free';

  return {
    ...document,
    layout: {
      ...document.layout,
      frames: document.layout.frames.map((frame) => (targetIds.has(frame.id) ? { ...frame, placement } : frame)),
    },
  };
}

export function applyEditorOperation(document: SfrbDocument, operation: EditorOperation): SfrbDocument {
  switch (operation.op) {
    case 'set-title':
      return applySetTitle(document, operation);
    case 'set-section-title':
      return applySetSectionTitle(document, operation);
    case 'set-template':
      return applySetTemplate(document, operation);
    case 'set-block-text':
      return applySetBlockText(document, operation);
    case 'insert-block':
      return applyInsertBlock(document, operation);
    case 'remove-block':
      return applyRemoveBlock(document, operation);
    case 'split-block':
      return applySplitBlock(document, operation);
    case 'set-frame-box':
      return applySetFrameBox(document, operation);
    case 'move-group':
      return applyMoveGroup(document, operation);
    case 'group-frames':
      return applyGroupFrames(document, operation);
    case 'ungroup-frames':
      return applyUngroupFrames(document, operation);
    case 'set-group-locked':
      return applySetGroupLocked(document, operation);
    case 'reconcile-freeform':
      return applyReconcileFreeform(document, operation);
  }
}
