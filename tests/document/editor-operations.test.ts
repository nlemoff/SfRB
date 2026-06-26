import { describe, expect, it } from 'vitest';

import {
  EDITOR_OPERATION_KINDS,
  OperationApplicationError,
  OperationParseError,
  applyEditorOperation,
  parseEditorOperation,
} from '../../src/document/operations';
import { parseDocument, type SfrbDocument } from '../../src/document/schema';

function createDocument(options?: { lockedGroup?: boolean; freeFrameId?: string }): SfrbDocument {
  const lockedGroup = options?.lockedGroup ?? true;

  const document = parseDocument({
    metadata: { title: 'Operations Resume', locale: 'en-US' },
    semantic: {
      sections: [
        { id: 'heroSection', title: 'Profile', blockIds: ['heroBlock', 'summaryBlock'] },
        { id: 'skillsSection', title: 'Skills', blockIds: ['skillsBlock'] },
      ],
      blocks: [
        { id: 'heroBlock', kind: 'heading', text: 'Alex Carter' },
        { id: 'summaryBlock', kind: 'paragraph', text: 'Calm, local-first tooling.' },
        { id: 'skillsBlock', kind: 'fact', text: 'TypeScript · Node.js' },
      ],
    },
    layout: {
      pages: [
        {
          id: 'mainPage',
          size: { width: 612, height: 792 },
          margin: { top: 36, right: 36, bottom: 36, left: 36 },
        },
      ],
      frames: [
        {
          id: 'heroFrame',
          pageId: 'mainPage',
          blockId: 'heroBlock',
          box: { x: 36, y: 32, width: 540, height: 44 },
          zIndex: 0,
        },
        {
          id: 'summaryFrame',
          pageId: 'mainPage',
          blockId: 'summaryBlock',
          box: { x: 36, y: 84, width: 540, height: 72 },
          zIndex: 1,
        },
        {
          id: 'skillsFrame',
          pageId: 'mainPage',
          blockId: 'skillsBlock',
          box: { x: 36, y: 176, width: 540, height: 40 },
          zIndex: 2,
        },
      ],
      frameGroups: [
        { id: 'heroComposition', pageId: 'mainPage', frameIds: ['heroFrame', 'summaryFrame'], locked: lockedGroup },
      ],
    },
  });

  if (options?.freeFrameId) {
    return {
      ...document,
      layout: {
        ...document.layout,
        frames: document.layout.frames.map((frame) =>
          frame.id === options.freeFrameId ? { ...frame, placement: 'free' as const } : frame,
        ),
      },
    };
  }

  return document;
}

function applyRaw(document: SfrbDocument, rawOperation: unknown): SfrbDocument {
  return applyEditorOperation(document, parseEditorOperation(rawOperation));
}

describe('parseEditorOperation', () => {
  it('exposes all thirteen operation kinds', () => {
    expect(EDITOR_OPERATION_KINDS).toHaveLength(13);
    expect(EDITOR_OPERATION_KINDS).toContain('set-frame-box');
    expect(EDITOR_OPERATION_KINDS).toContain('reconcile-freeform');
  });

  it('rejects unknown operation kinds with a parse error', () => {
    expect(() => parseEditorOperation({ op: 'explode-document' })).toThrowError(OperationParseError);
  });

  it('rejects payloads with unknown keys and reports the path', () => {
    try {
      parseEditorOperation({ op: 'set-title', title: 'Ok', extra: true });
      expect.unreachable('parse should have failed');
    } catch (error) {
      expect(error).toBeInstanceOf(OperationParseError);
      expect((error as OperationParseError).issues.length).toBeGreaterThan(0);
    }
  });
});

describe('content operations', () => {
  it('set-title replaces the document title without touching anything else', () => {
    const document = createDocument();
    const next = applyRaw(document, { op: 'set-title', title: 'New Title' });

    expect(next.metadata.title).toBe('New Title');
    expect(next.semantic).toEqual(document.semantic);
    expect(next.layout).toEqual(document.layout);
  });

  it('set-section-title rejects missing sections', () => {
    expect(() => applyRaw(createDocument(), { op: 'set-section-title', sectionId: 'ghost', title: 'X' })).toThrowError(
      /does not contain semantic section "ghost"/,
    );
  });

  it('set-template stamps registry metadata', () => {
    const next = applyRaw(createDocument(), { op: 'set-template', templateId: 'classic' });

    expect(next.metadata.template).toEqual({ id: 'classic', version: '1' });
  });

  it('set-block-text replaces text and rejects missing blocks', () => {
    const next = applyRaw(createDocument(), { op: 'set-block-text', blockId: 'summaryBlock', text: 'Rewritten.' });
    expect(next.semantic.blocks.find((block) => block.id === 'summaryBlock')?.text).toBe('Rewritten.');

    expect(() => applyRaw(createDocument(), { op: 'set-block-text', blockId: 'ghost', text: 'X' })).toThrowError(
      /does not contain semantic block "ghost"/,
    );
  });
});

describe('insert-block', () => {
  it('appends to the section end by default and defaults the frame zIndex', () => {
    const next = applyRaw(createDocument(), {
      op: 'insert-block',
      sectionId: 'skillsSection',
      block: { id: 'extraBlock', kind: 'bullet', text: 'New bullet.' },
      frame: { id: 'extraFrame', pageId: 'mainPage', box: { x: 36, y: 240, width: 540, height: 32 } },
    });

    const section = next.semantic.sections.find((candidate) => candidate.id === 'skillsSection');
    expect(section?.blockIds).toEqual(['skillsBlock', 'extraBlock']);

    const frame = next.layout.frames.find((candidate) => candidate.id === 'extraFrame');
    expect(frame).toMatchObject({ blockId: 'extraBlock', zIndex: 3, placement: 'managed' });
  });

  it('inserts at an explicit index', () => {
    const next = applyRaw(createDocument(), {
      op: 'insert-block',
      sectionId: 'heroSection',
      index: 0,
      block: { id: 'openerBlock', kind: 'paragraph', text: 'Opener.' },
      frame: { id: 'openerFrame', pageId: 'mainPage', box: { x: 36, y: 10, width: 540, height: 20 } },
    });

    expect(next.semantic.sections[0].blockIds).toEqual(['openerBlock', 'heroBlock', 'summaryBlock']);
  });

  it('rejects out-of-range indexes and id collisions', () => {
    expect(() =>
      applyRaw(createDocument(), {
        op: 'insert-block',
        sectionId: 'skillsSection',
        index: 5,
        block: { id: 'extraBlock', kind: 'bullet', text: 'X' },
      }),
    ).toThrowError(/out of range/);

    expect(() =>
      applyRaw(createDocument(), {
        op: 'insert-block',
        sectionId: 'skillsSection',
        block: { id: 'heroBlock', kind: 'bullet', text: 'X' },
      }),
    ).toThrowError(/already in use/);
  });
});

describe('remove-block', () => {
  it('cascades: section membership, frame, and group membership with dissolve', () => {
    const next = applyRaw(createDocument(), { op: 'remove-block', blockId: 'summaryBlock' });

    expect(next.semantic.blocks.map((block) => block.id)).toEqual(['heroBlock', 'skillsBlock']);
    expect(next.semantic.sections.find((section) => section.id === 'heroSection')?.blockIds).toEqual(['heroBlock']);
    expect(next.layout.frames.map((frame) => frame.id)).toEqual(['heroFrame', 'skillsFrame']);
    // heroComposition lost summaryFrame and fell below two members.
    expect(next.layout.frameGroups).toEqual([]);
  });

  it('drops a section that loses its last block', () => {
    const next = applyRaw(createDocument(), { op: 'remove-block', blockId: 'skillsBlock' });

    expect(next.semantic.sections.map((section) => section.id)).toEqual(['heroSection']);
  });

  it('refuses to remove the last semantic block', () => {
    let document = createDocument();
    document = applyRaw(document, { op: 'remove-block', blockId: 'heroBlock' });
    document = applyRaw(document, { op: 'remove-block', blockId: 'summaryBlock' });

    expect(() => applyRaw(document, { op: 'remove-block', blockId: 'skillsBlock' })).toThrowError(
      /last semantic block/,
    );
  });
});

describe('split-block', () => {
  it('atomically replaces a frame-backed block with provenance-carrying segments', () => {
    const next = applyRaw(createDocument(), {
      op: 'split-block',
      blockId: 'summaryBlock',
      segments: [
        { id: 'summaryLineOne', text: 'Calm tooling.' },
        { id: 'summaryLineTwo', text: 'Local-first by default.' },
      ],
      frames: [
        { id: 'summaryLineOneFrame', box: { x: 36, y: 84, width: 540, height: 36 } },
        { id: 'summaryLineTwoFrame', box: { x: 36, y: 120, width: 540, height: 36 } },
      ],
    });

    const section = next.semantic.sections[0];
    expect(section.blockIds).toEqual(['heroBlock', 'summaryLineOne', 'summaryLineTwo']);

    const segments = next.semantic.blocks.filter((block) => block.splitFrom === 'summaryBlock');
    expect(segments.map((block) => block.kind)).toEqual(['paragraph', 'paragraph']);

    expect(next.layout.frames.some((frame) => frame.id === 'summaryFrame')).toBe(false);
    const segmentFrames = next.layout.frames.filter((frame) => frame.id.startsWith('summaryLine'));
    expect(segmentFrames.map((frame) => frame.zIndex)).toEqual([1, 1]);
    expect(segmentFrames.map((frame) => frame.blockId)).toEqual(['summaryLineOne', 'summaryLineTwo']);

    // The original frame left its group; the group dissolved below two members.
    expect(next.layout.frameGroups).toEqual([]);
  });

  it('requires segment frames for frame-backed blocks and forbids them otherwise', () => {
    expect(() =>
      applyRaw(createDocument(), {
        op: 'split-block',
        blockId: 'summaryBlock',
        segments: [
          { id: 'a1', text: 'One.' },
          { id: 'a2', text: 'Two.' },
        ],
      }),
    ).toThrowError(/frame-backed; provide one frame per segment/);
  });

  it('rejects mismatched frame counts and id collisions', () => {
    expect(() =>
      applyRaw(createDocument(), {
        op: 'split-block',
        blockId: 'summaryBlock',
        segments: [
          { id: 'a1', text: 'One.' },
          { id: 'a2', text: 'Two.' },
        ],
        frames: [{ id: 'f1', box: { x: 36, y: 84, width: 540, height: 36 } }],
      }),
    ).toThrowError(/must match segments/);

    expect(() =>
      applyRaw(createDocument(), {
        op: 'split-block',
        blockId: 'summaryBlock',
        segments: [
          { id: 'heroBlock', text: 'One.' },
          { id: 'a2', text: 'Two.' },
        ],
        frames: [
          { id: 'f1', box: { x: 36, y: 84, width: 540, height: 36 } },
          { id: 'f2', box: { x: 36, y: 120, width: 540, height: 36 } },
        ],
      }),
    ).toThrowError(/already in use/);
  });
});

describe('set-frame-box', () => {
  it('moves and resizes unlocked managed frames', () => {
    const next = applyRaw(createDocument(), {
      op: 'set-frame-box',
      frameId: 'skillsFrame',
      box: { x: 40, y: 200, width: 500, height: 60 },
    });

    expect(next.layout.frames.find((frame) => frame.id === 'skillsFrame')?.box).toEqual({
      x: 40,
      y: 200,
      width: 500,
      height: 60,
    });
  });

  it('rejects locked group members with a directive message', () => {
    expect(() =>
      applyRaw(createDocument(), {
        op: 'set-frame-box',
        frameId: 'heroFrame',
        box: { x: 0, y: 0, width: 100, height: 100 },
      }),
    ).toThrowError(/locked group member — move the group "heroComposition" or unlock it/);
  });

  it('rejects freeform-placed frames unless asFreeform acknowledges the lens', () => {
    const document = createDocument({ freeFrameId: 'skillsFrame' });

    expect(() =>
      applyRaw(document, {
        op: 'set-frame-box',
        frameId: 'skillsFrame',
        box: { x: 40, y: 200, width: 500, height: 60 },
      }),
    ).toThrowError(/freeform-placed — edit it in the freeform lens/);

    const next = applyRaw(document, {
      op: 'set-frame-box',
      frameId: 'skillsFrame',
      box: { x: 40, y: 200, width: 500, height: 60 },
      asFreeform: true,
    });
    expect(next.layout.frames.find((frame) => frame.id === 'skillsFrame')?.placement).toBe('free');
  });

  it('ignores asFreeform on managed frames without changing placement', () => {
    const next = applyRaw(createDocument(), {
      op: 'set-frame-box',
      frameId: 'skillsFrame',
      box: { x: 40, y: 200, width: 500, height: 60 },
      asFreeform: true,
    });

    expect(next.layout.frames.find((frame) => frame.id === 'skillsFrame')?.placement).toBe('managed');
  });
});

describe('group operations', () => {
  it('move-group translates every member of a locked group', () => {
    const next = applyRaw(createDocument(), { op: 'move-group', groupId: 'heroComposition', dx: 10, dy: -5 });

    expect(next.layout.frames.find((frame) => frame.id === 'heroFrame')?.box).toMatchObject({ x: 46, y: 27 });
    expect(next.layout.frames.find((frame) => frame.id === 'summaryFrame')?.box).toMatchObject({ x: 46, y: 79 });
    expect(next.layout.frames.find((frame) => frame.id === 'skillsFrame')?.box).toMatchObject({ x: 36, y: 176 });
  });

  it('move-group rejects unlocked groups', () => {
    expect(() =>
      applyRaw(createDocument({ lockedGroup: false }), { op: 'move-group', groupId: 'heroComposition', dx: 1, dy: 1 }),
    ).toThrowError(/is not locked/);
  });

  it('group-frames creates a group and enforces membership rules', () => {
    let document = applyRaw(createDocument(), { op: 'ungroup-frames', groupId: 'heroComposition' });
    document = applyRaw(document, {
      op: 'group-frames',
      groupId: 'fullStack',
      frameIds: ['heroFrame', 'summaryFrame', 'skillsFrame'],
      locked: true,
    });

    expect(document.layout.frameGroups).toEqual([
      { id: 'fullStack', pageId: 'mainPage', frameIds: ['heroFrame', 'summaryFrame', 'skillsFrame'], locked: true },
    ]);
  });

  it('group-frames rejects members that are already grouped or freeform-placed', () => {
    expect(() =>
      applyRaw(createDocument(), { op: 'group-frames', groupId: 'second', frameIds: ['heroFrame', 'skillsFrame'] }),
    ).toThrowError(/already belongs to frame group "heroComposition"/);

    const withFree = createDocument({ freeFrameId: 'skillsFrame' });
    const ungrouped = applyRaw(withFree, { op: 'ungroup-frames', groupId: 'heroComposition' });
    expect(() =>
      applyRaw(ungrouped, { op: 'group-frames', groupId: 'second', frameIds: ['heroFrame', 'skillsFrame'] }),
    ).toThrowError(/freeform-placed — reconcile it before grouping/);
  });

  it('set-group-locked toggles the lock in place', () => {
    const next = applyRaw(createDocument({ lockedGroup: false }), {
      op: 'set-group-locked',
      groupId: 'heroComposition',
      locked: true,
    });

    expect(next.layout.frameGroups[0].locked).toBe(true);
  });

  it('ungroup-frames removes the group but keeps the frames', () => {
    const next = applyRaw(createDocument(), { op: 'ungroup-frames', groupId: 'heroComposition' });

    expect(next.layout.frameGroups).toEqual([]);
    expect(next.layout.frames).toHaveLength(3);
  });
});

describe('reconcile-freeform', () => {
  it('keep_locked marks frames free without touching geometry', () => {
    const document = createDocument();
    const before = document.layout.frames.map((frame) => frame.box);

    const next = applyRaw(document, { op: 'reconcile-freeform', outcome: 'keep_locked', frameIds: ['skillsFrame'] });

    expect(next.layout.frames.find((frame) => frame.id === 'skillsFrame')?.placement).toBe('free');
    expect(next.layout.frames.map((frame) => frame.box)).toEqual(before);
  });

  it('rejoin_layout marks frames managed without touching geometry', () => {
    const document = createDocument({ freeFrameId: 'skillsFrame' });
    const before = document.layout.frames.map((frame) => frame.box);

    const next = applyRaw(document, { op: 'reconcile-freeform', outcome: 'rejoin_layout', frameIds: ['skillsFrame'] });

    expect(next.layout.frames.find((frame) => frame.id === 'skillsFrame')?.placement).toBe('managed');
    expect(next.layout.frames.map((frame) => frame.box)).toEqual(before);
  });

  it('rejects unknown frames', () => {
    expect(() =>
      applyRaw(createDocument(), { op: 'reconcile-freeform', outcome: 'keep_locked', frameIds: ['ghostFrame'] }),
    ).toThrowError(OperationApplicationError);
  });
});
