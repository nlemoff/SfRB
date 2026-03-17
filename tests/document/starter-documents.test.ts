import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { PhysicsMode } from '../../src/config/schema';
import { writeConfig } from '../../src/config/store';
import { STARTER_IDS, createStarterDocument } from '../../src/document/starters';
import { getDocumentPath, readDocument, readWorkspaceDocument, writeDocument } from '../../src/document/store';

const tempDirs: string[] = [];
const physicsModes: PhysicsMode[] = ['document', 'design'];
const starterKinds = ['template', 'blank'] as const;

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-starters-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('starter documents', () => {
  it.each(starterKinds.flatMap((kind) => physicsModes.map((physics) => [kind, physics] as const)))(
    'keeps %s starter metadata and passes schema + %s physics validation',
    async (kind, physics) => {
      const projectRoot = await makeTempProject();
      await writeConfig(
        {
          ai: {
            provider: 'openai',
            apiKeyEnvVar: 'OPENAI_API_KEY',
          },
          workspace: {
            physics,
          },
        },
        projectRoot,
      );

      const starter = createStarterDocument(kind, physics);
      const written = await writeDocument(starter, projectRoot);
      const schemaRead = await readDocument(projectRoot);
      const workspaceRead = await readWorkspaceDocument(projectRoot);
      const persistedRaw = await readFile(getDocumentPath(projectRoot), 'utf8');

      expect(written.metadata.starter).toEqual({
        id: STARTER_IDS[kind],
        kind,
      });
      expect(schemaRead.metadata.starter).toEqual({
        id: STARTER_IDS[kind],
        kind,
      });
      expect(workspaceRead.metadata.starter).toEqual({
        id: STARTER_IDS[kind],
        kind,
      });
      expect(persistedRaw).toContain(`"id": "${STARTER_IDS[kind]}"`);
      expect(persistedRaw).toContain(`"kind": "${kind}"`);

      if (physics === 'document') {
        expect(workspaceRead.layout.frames).toHaveLength(0);
      } else {
        expect(workspaceRead.layout.frames).toHaveLength(workspaceRead.semantic.blocks.length);
      }
    },
  );

  it('keeps the blank starter intentionally sparse while remaining valid', () => {
    const blankDocument = createStarterDocument('blank', 'document');
    const blankDesign = createStarterDocument('blank', 'design');

    expect(blankDocument.metadata.title).toBe('Untitled Resume');
    expect(blankDocument.semantic.sections).toEqual([
      {
        id: 'summary',
        title: 'Summary',
        blockIds: ['summaryBlock'],
      },
    ]);
    expect(blankDocument.semantic.blocks).toEqual([
      {
        id: 'summaryBlock',
        kind: 'paragraph',
        text: 'Add your first line here.',
      },
    ]);
    expect(blankDocument.layout.frames).toEqual([]);
    expect(blankDesign.layout.frames).toEqual([
      expect.objectContaining({
        id: 'summaryFrame',
        blockId: 'summaryBlock',
        pageId: 'pageOne',
      }),
    ]);
  });

  it('keeps the template starter strong enough for stable targeting and editing', () => {
    const templateDocument = createStarterDocument('template', 'design');

    expect(templateDocument.metadata.title).toBe('Alex Carter Resume');
    expect(templateDocument.semantic.sections.map((section) => section.id)).toEqual([
      'heroSection',
      'experienceSection',
      'skillsSection',
    ]);
    expect(templateDocument.semantic.blocks.map((block) => block.id)).toEqual([
      'heroNameBlock',
      'heroSummaryBlock',
      'experienceLeadBlock',
      'experienceSystemsBlock',
      'skillsBlock',
    ]);
    expect(templateDocument.layout.frames.map((frame) => frame.id)).toEqual([
      'heroNameFrame',
      'heroSummaryFrame',
      'experienceLeadFrame',
      'experienceSystemsFrame',
      'skillsFrame',
    ]);
    expect(templateDocument.semantic.blocks[0]?.text).toContain('Alex Carter');
    expect(templateDocument.semantic.blocks[1]?.text).toContain('local-first tools');
  });
});
