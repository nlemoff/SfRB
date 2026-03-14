import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../src/config/store';
import { getDocumentPath, readWorkspaceDocument, writeDocument } from '../../src/document/store';

const tempDirs: string[] = [];

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-document-validation-'));
  tempDirs.push(dir);
  return dir;
}

function createDocument(options?: { includeFrames?: boolean; missingSecondFrame?: boolean }) {
  const includeFrames = options?.includeFrames ?? true;
  const missingSecondFrame = options?.missingSecondFrame ?? false;

  return {
    metadata: {
      title: 'Alex Resume',
      locale: 'en-US',
    },
    semantic: {
      sections: [
        {
          id: 'summary',
          title: 'Summary',
          blockIds: ['summary-block', 'impact-block'],
        },
      ],
      blocks: [
        {
          id: 'summary-block',
          kind: 'paragraph',
          text: 'Builds careful local-first tooling.',
        },
        {
          id: 'impact-block',
          kind: 'bullet',
          text: 'Ships reproducible validation boundaries.',
        },
      ],
    },
    layout: {
      pages: [
        {
          id: 'page-1',
          size: {
            width: 612,
            height: 792,
          },
          margin: {
            top: 48,
            right: 48,
            bottom: 48,
            left: 48,
          },
        },
      ],
      frames: includeFrames
        ? [
            {
              id: 'frame-summary',
              pageId: 'page-1',
              blockId: 'summary-block',
              box: {
                x: 48,
                y: 72,
                width: 516,
                height: 96,
              },
              zIndex: 0,
            },
            ...(missingSecondFrame
              ? []
              : [
                  {
                    id: 'frame-impact',
                    pageId: 'page-1',
                    blockId: 'impact-block',
                    box: {
                      x: 48,
                      y: 184,
                      width: 516,
                      height: 120,
                    },
                    zIndex: 1,
                  },
                ]),
          ]
        : [],
    },
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('document validation against workspace physics', () => {
  it('accepts a frame-free document in document physics', async () => {
    const projectRoot = await makeTempProject();
    await writeConfig(
      {
        ai: {
          provider: 'openai',
          apiKeyEnvVar: 'OPENAI_API_KEY',
        },
        workspace: {
          physics: 'document',
        },
      },
      projectRoot,
    );
    await writeDocument(createDocument({ includeFrames: false }), projectRoot);

    await expect(readWorkspaceDocument(projectRoot)).resolves.toMatchObject({
      layout: {
        frames: [],
      },
    });
  });

  it('accepts a fully framed document in design physics', async () => {
    const projectRoot = await makeTempProject();
    await writeConfig(
      {
        ai: {
          provider: 'anthropic',
          apiKeyEnvVar: 'ANTHROPIC_API_KEY',
        },
        workspace: {
          physics: 'design',
        },
      },
      projectRoot,
    );
    await writeDocument(createDocument(), projectRoot);

    await expect(readWorkspaceDocument(projectRoot)).resolves.toMatchObject({
      layout: {
        frames: expect.arrayContaining([
          expect.objectContaining({ id: 'frame-summary' }),
          expect.objectContaining({ id: 'frame-impact' }),
        ]),
      },
    });
  });

  it('rejects fixed frames in document physics with file and field context', async () => {
    const projectRoot = await makeTempProject();
    await writeConfig(
      {
        ai: {
          provider: 'openai',
          apiKeyEnvVar: 'OPENAI_API_KEY',
        },
        workspace: {
          physics: 'document',
        },
      },
      projectRoot,
    );
    await writeDocument(createDocument(), projectRoot);

    const documentPath = getDocumentPath(projectRoot);

    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(documentPath);
    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(/layout\.frames\.0/);
    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(/workspace\.physics to "design"/i);
  });

  it('rejects missing layout coverage in design physics', async () => {
    const projectRoot = await makeTempProject();
    await writeConfig(
      {
        ai: {
          provider: 'anthropic',
          apiKeyEnvVar: 'ANTHROPIC_API_KEY',
        },
        workspace: {
          physics: 'design',
        },
      },
      projectRoot,
    );
    await writeDocument(createDocument({ missingSecondFrame: true }), projectRoot);

    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(/semantic\.blocks\.1\.id/);
    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(/impact-block/);
    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(/workspace\.physics to "document"/i);
  });

  it('surfaces missing workspace config with both config and document paths', async () => {
    const projectRoot = await makeTempProject();
    await writeDocument(createDocument({ includeFrames: false }), projectRoot);

    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(/sfrb\.config\.json/);
    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(/resume\.sfrb\.json/);
    await expect(readWorkspaceDocument(projectRoot)).rejects.toThrowError(/run `sfrb init` first/i);
  });
});
