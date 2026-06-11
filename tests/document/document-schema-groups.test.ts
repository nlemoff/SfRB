import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseDocument } from '../../src/document/schema';
import { readDocument, writeDocument } from '../../src/document/store';

const tempDirs: string[] = [];

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-document-groups-'));
  tempDirs.push(dir);
  return dir;
}

function createGroupedDocument() {
  return {
    metadata: {
      title: 'Grouped Resume',
      locale: 'en-US',
    },
    semantic: {
      sections: [
        {
          id: 'summary',
          title: 'Summary',
          blockIds: ['hero-block', 'impact-block'],
        },
      ],
      blocks: [
        {
          id: 'hero-block',
          kind: 'heading',
          text: 'Alex Carter',
        },
        {
          id: 'impact-block',
          kind: 'paragraph',
          text: 'Ships reproducible validation boundaries.',
        },
      ],
    },
    layout: {
      pages: [
        {
          id: 'page-1',
          size: { width: 612, height: 792 },
          margin: { top: 48, right: 48, bottom: 48, left: 48 },
        },
      ],
      frames: [
        {
          id: 'hero-frame',
          pageId: 'page-1',
          blockId: 'hero-block',
          box: { x: 48, y: 60, width: 516, height: 40 },
          zIndex: 0,
        },
        {
          id: 'impact-frame',
          pageId: 'page-1',
          blockId: 'impact-block',
          box: { x: 48, y: 120, width: 516, height: 96 },
          zIndex: 1,
        },
      ],
      frameGroups: [
        {
          id: 'hero-composition',
          pageId: 'page-1',
          frameIds: ['hero-frame', 'impact-frame'],
          locked: true,
        },
      ],
    },
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('frame groups and placement', () => {
  it('parses a valid locked group and defaults frame placement to managed', () => {
    const parsed = parseDocument(createGroupedDocument());

    expect(parsed.layout.frameGroups).toEqual([
      {
        id: 'hero-composition',
        pageId: 'page-1',
        frameIds: ['hero-frame', 'impact-frame'],
        locked: true,
      },
    ]);
    expect(parsed.layout.frames.map((frame) => frame.placement)).toEqual(['managed', 'managed']);
  });

  it('defaults frameGroups to an empty array for documents that never mention them', () => {
    const document = createGroupedDocument();
    const { frameGroups: _omitted, ...layout } = document.layout;

    const parsed = parseDocument({ ...document, layout });

    expect(parsed.layout.frameGroups).toEqual([]);
  });

  it('round-trips free placement and groups through the canonical store', async () => {
    const projectRoot = await makeTempProject();
    const document = createGroupedDocument();
    Object.assign(document.layout.frames[1], { placement: 'free' });

    const written = await writeDocument(document, projectRoot);
    const reread = await readDocument(projectRoot);

    expect(reread).toEqual(written);
    expect(reread.layout.frames[1].placement).toBe('free');
    expect(reread.layout.frameGroups).toHaveLength(1);
  });

  it('rejects duplicate frame group ids through the canonical store boundary', async () => {
    const projectRoot = await makeTempProject();
    const document = createGroupedDocument();
    document.layout.frameGroups = [
      { id: 'hero-composition', pageId: 'page-1', frameIds: ['hero-frame', 'impact-frame'], locked: false },
      { id: 'hero-composition', pageId: 'page-1', frameIds: ['hero-frame', 'impact-frame'], locked: true },
    ];

    await expect(writeDocument(document, projectRoot)).rejects.toThrowError(/layout\.frameGroups\.1\.id/);
    await expect(writeDocument(document, projectRoot)).rejects.toThrowError(/duplicate frame group id/i);
  });

  it('rejects groups that reference missing frames', async () => {
    const projectRoot = await makeTempProject();
    const document = createGroupedDocument();
    document.layout.frameGroups[0].frameIds = ['hero-frame', 'ghost-frame'];

    await expect(writeDocument(document, projectRoot)).rejects.toThrowError(/layout\.frameGroups\.0\.frameIds\.1/);
    await expect(writeDocument(document, projectRoot)).rejects.toThrowError(/missing layout frame "ghost-frame"/i);
  });

  it('rejects a frame that belongs to more than one group', async () => {
    const projectRoot = await makeTempProject();
    const document = createGroupedDocument();
    document.layout.frameGroups = [
      { id: 'hero-composition', pageId: 'page-1', frameIds: ['hero-frame', 'impact-frame'], locked: true },
      { id: 'second-composition', pageId: 'page-1', frameIds: ['impact-frame', 'hero-frame'], locked: false },
    ];

    await expect(writeDocument(document, projectRoot)).rejects.toThrowError(
      /already belongs to frame group "hero-composition"/i,
    );
  });

  it('rejects group members that live on a different page than the group', async () => {
    const projectRoot = await makeTempProject();
    const document = createGroupedDocument();
    document.layout.pages.push({
      id: 'page-2',
      size: { width: 612, height: 792 },
      margin: { top: 48, right: 48, bottom: 48, left: 48 },
    });
    document.layout.frameGroups[0].pageId = 'page-2';

    await expect(writeDocument(document, projectRoot)).rejects.toThrowError(
      /is on page "page-1" but the group targets page "page-2"/i,
    );
  });

  it('rejects groups with fewer than two members', () => {
    const document = createGroupedDocument();
    document.layout.frameGroups[0].frameIds = ['hero-frame'];

    expect(() => parseDocument(document)).toThrowError(/at least two member frames/i);
  });

  it('rejects groups that reference a missing page', async () => {
    const projectRoot = await makeTempProject();
    const document = createGroupedDocument();
    document.layout.frameGroups[0].pageId = 'ghost-page';

    await expect(writeDocument(document, projectRoot)).rejects.toThrowError(/layout\.frameGroups\.0\.pageId/);
    await expect(writeDocument(document, projectRoot)).rejects.toThrowError(/missing page "ghost-page"/i);
  });
});

describe('divider blocks and split provenance', () => {
  it('parses a divider block with empty text', () => {
    const document = createGroupedDocument();
    document.semantic.sections[0].blockIds.push('rule-block');
    document.semantic.blocks.push({ id: 'rule-block', kind: 'divider', text: '' });
    document.layout.frames.push({
      id: 'rule-frame',
      pageId: 'page-1',
      blockId: 'rule-block',
      box: { x: 48, y: 230, width: 516, height: 12 },
      zIndex: 2,
    });

    const parsed = parseDocument(document);
    const divider = parsed.semantic.blocks.find((block) => block.kind === 'divider');

    expect(divider).toMatchObject({ id: 'rule-block', text: '' });
  });

  it('still rejects empty text on non-divider blocks with the canonical message', () => {
    const document = createGroupedDocument();
    document.semantic.blocks[1].text = '';

    expect(() => parseDocument(document)).toThrowError(/Block text is required/);
  });

  it('keeps split provenance through parse', () => {
    const document = createGroupedDocument();
    Object.assign(document.semantic.blocks[1], { splitFrom: 'original-block' });

    const parsed = parseDocument(document);

    expect(parsed.semantic.blocks[1].splitFrom).toBe('original-block');
  });

  it('rejects malformed split provenance ids', () => {
    const document = createGroupedDocument();
    Object.assign(document.semantic.blocks[1], { splitFrom: '!!bad id!!' });

    expect(() => parseDocument(document)).toThrowError(/Stable ids must start with a letter/);
  });
});
