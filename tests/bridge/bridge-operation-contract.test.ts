import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  postEditorBody,
  postEditorOperation,
  readWorkspaceDocument,
  readWorkspaceDocumentRaw,
  waitForBootstrapMatch,
  waitForBridgeReady,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

function createGroupedWorkspaceDocument() {
  return {
    metadata: { title: 'Operation Contract', locale: 'en-US' },
    semantic: {
      sections: [{ id: 'heroSection', title: 'Profile', blockIds: ['heroBlock', 'summaryBlock'] }],
      blocks: [
        { id: 'heroBlock', kind: 'heading', text: 'Alex Carter' },
        { id: 'summaryBlock', kind: 'paragraph', text: 'Locked composition coverage.' },
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
        { id: 'heroFrame', pageId: 'mainPage', blockId: 'heroBlock', box: { x: 36, y: 32, width: 540, height: 44 }, zIndex: 0 },
        { id: 'summaryFrame', pageId: 'mainPage', blockId: 'summaryBlock', box: { x: 36, y: 84, width: 540, height: 72 }, zIndex: 1 },
      ],
      frameGroups: [
        { id: 'heroComposition', pageId: 'mainPage', frameIds: ['heroFrame', 'summaryFrame'], locked: true },
      ],
    },
  };
}

describe('bridge operation contract', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('persists a structured operation through the canonical write path and converges with bootstrap', async () => {
    const projectRoot = await makeTempProject('sfrb-operation-success-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', blockText: 'Before operation.' });

    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const result = await postEditorOperation(url, {
        op: 'set-block-text',
        blockId: 'summaryBlock',
        text: 'Updated by structured operation.',
      });

      expect(result.status).toBe(200);
      expect(result.payload).toMatchObject({
        ok: true,
        status: 'saved',
        saveState: 'idle',
        physics: 'design',
        operationKind: 'set-block-text',
        workspaceRoot: projectRoot,
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
      });

      const persisted = await readWorkspaceDocument(projectRoot);
      const blocks = (persisted.semantic as { blocks: Array<{ id: string; text: string }> }).blocks;
      expect(blocks.find((block) => block.id === 'summaryBlock')?.text).toBe('Updated by structured operation.');

      // Bootstrap reconciles from the bridge file watcher, which is debounced.
      const bootstrap = await waitForBootstrapMatch(url, (payload, status) => {
        if (status !== 200) {
          return false;
        }
        const document = payload.document as { semantic: { blocks: Array<{ id: string; text: string }> } } | undefined;
        return (
          document?.semantic.blocks.find((block) => block.id === 'summaryBlock')?.text ===
          'Updated by structured operation.'
        );
      });
      expect(bootstrap.status).toBe(200);
    } finally {
      await closeBridge(child);
    }
  });

  it('rejects malformed operations with 400 operation_invalid and never writes', async () => {
    const projectRoot = await makeTempProject('sfrb-operation-malformed-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', blockText: 'Malformed coverage.' });

    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const result = await postEditorOperation(url, { op: 'explode-document' });

      expect(result.status).toBe(400);
      expect(result.payload).toMatchObject({
        ok: false,
        status: 'error',
        saveState: 'error',
        code: 'operation_invalid',
      });
      expect(Array.isArray(result.payload.issues)).toBe(true);

      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
    } finally {
      await closeBridge(child);
    }
  });

  it('rejects locked-group member moves with 400 operation_invalid and never writes', async () => {
    const projectRoot = await makeTempProject('sfrb-operation-locked-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design' });
    await writeFile(
      path.join(projectRoot, 'resume.sfrb.json'),
      `${JSON.stringify(createGroupedWorkspaceDocument(), null, 2)}\n`,
      'utf8',
    );

    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const result = await postEditorOperation(url, {
        op: 'set-frame-box',
        frameId: 'heroFrame',
        box: { x: 0, y: 0, width: 100, height: 100 },
      });

      expect(result.status).toBe(400);
      expect(result.payload).toMatchObject({
        ok: false,
        code: 'operation_invalid',
      });
      expect(String(result.payload.message)).toContain('locked group member');

      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
    } finally {
      await closeBridge(child);
    }
  });

  it('rejects operations whose result violates workspace physics with 409 and never writes', async () => {
    const projectRoot = await makeTempProject('sfrb-operation-physics-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', blockText: 'Physics coverage.' });

    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const result = await postEditorOperation(url, {
        op: 'insert-block',
        sectionId: 'summary',
        block: { id: 'framedBlock', kind: 'paragraph', text: 'Needs a frame.' },
        frame: { id: 'framedFrame', pageId: 'pageOne', box: { x: 36, y: 200, width: 540, height: 48 } },
      });

      expect(result.status).toBe(409);
      expect(result.payload).toMatchObject({
        ok: false,
        code: 'physics_invalid',
      });

      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
    } finally {
      await closeBridge(child);
    }
  });

  it('rejects bodies that carry both document and operation with 400 request_invalid', async () => {
    const projectRoot = await makeTempProject('sfrb-operation-ambiguous-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design' });

    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const result = await postEditorBody(url, {
        document: createGroupedWorkspaceDocument(),
        operation: { op: 'set-title', title: 'Ambiguous' },
      });

      expect(result.status).toBe(400);
      expect(result.payload).toMatchObject({
        ok: false,
        code: 'request_invalid',
      });

      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
    } finally {
      await closeBridge(child);
    }
  });
});
