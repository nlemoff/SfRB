#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function createDocument(options = {}) {
  const includeFrames = options.includeFrames ?? true;
  const missingSecondFrame = options.missingSecondFrame ?? false;

  return {
    metadata: {
      title: 'Smoke Resume',
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
          text: 'Validates workspace physics through real files.',
        },
        {
          id: 'impact-block',
          kind: 'bullet',
          text: 'Catches mismatches with actionable paths.',
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

async function loadBuiltModule(relativePath) {
  return import(pathToFileURL(path.join(repoRoot, relativePath)).href);
}

async function main() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'sfrb-s02-smoke-'));

  try {
    await execFile('npm', ['run', 'build'], { cwd: repoRoot });

    const { writeConfig } = await loadBuiltModule('dist/config/store.js');
    const { writeDocument, readWorkspaceDocument, getDocumentPath } = await loadBuiltModule('dist/document/store.js');

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
      workspace,
    );
    await writeDocument(createDocument({ includeFrames: false }), workspace);
    await readWorkspaceDocument(workspace);

    await writeDocument(createDocument(), workspace);
    await expectFailure(
      () => readWorkspaceDocument(workspace),
      /layout\.frames\.0/,
      'document workspace should reject fixed layout frames',
    );

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
      workspace,
    );
    await writeDocument(createDocument(), workspace);
    await readWorkspaceDocument(workspace);

    await writeDocument(createDocument({ missingSecondFrame: true }), workspace);
    await expectFailure(
      () => readWorkspaceDocument(workspace),
      /semantic\.blocks\.1\.id/,
      'design workspace should reject blocks without frames',
    );

    await rm(path.join(workspace, 'sfrb.config.json'), { force: true });
    await expectFailure(
      () => readWorkspaceDocument(workspace),
      /sfrb\.config\.json/,
      'missing workspace config should be explicit',
    );

    console.log('S02 document smoke check passed.');
    console.log(`Workspace: ${workspace}`);
    console.log(`Document: ${getDocumentPath(workspace)}`);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function expectFailure(run, pattern, label) {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!pattern.test(message)) {
      throw new Error(`${label}: expected ${pattern}, received:\n${message}`);
    }
    return;
  }

  throw new Error(`${label}: expected failure but the call succeeded.`);
}

await main();
