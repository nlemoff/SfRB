import path from 'node:path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  BRIDGE_BOOTSTRAP_PATH,
  BRIDGE_UPDATE_EVENT,
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  fetchBootstrap,
  getViteWebSocket,
  makeTempProject,
  postEditorMutation,
  readWorkspaceDocument,
  waitForBootstrapMatch,
  waitForBridgeReady,
  waitForCustomEvent,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

describe('bridge editor contract', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('persists a valid browser write and exposes the canonical updated layout through bootstrap', async () => {
    const projectRoot = await makeTempProject('sfrb-bridge-contract-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Before Mutation',
      blockText: 'Original summary text.',
    });

    const { child, url, stderr } = await waitForBridgeReady(projectRoot);
    const socket = await getViteWebSocket(url);

    try {
      const initial = await fetchBootstrap(url);
      expect(initial.status).toBe(200);
      expect(initial.payload).toMatchObject({
        status: 'ready',
        workspaceRoot: projectRoot,
        physics: 'design',
      });
      expect(initial.payload.document).toMatchObject({
        layout: {
          pages: [
            {
              id: 'pageOne',
              size: { width: 612, height: 792 },
              margin: { top: 36, right: 36, bottom: 36, left: 36 },
            },
          ],
          frames: [
            {
              id: 'summaryFrame',
              pageId: 'pageOne',
              blockId: 'summaryBlock',
              box: { x: 36, y: 48, width: 540, height: 96 },
              zIndex: 0,
            },
          ],
        },
      });

      const mutatedDocument = structuredClone(initial.payload.document as Record<string, unknown>);
      (mutatedDocument.metadata as { title: string }).title = 'After Mutation';
      (mutatedDocument.semantic as { blocks: Array<{ text: string }> }).blocks[0].text = 'Saved from the browser write contract.';
      ((mutatedDocument.layout as { frames: Array<{ box: { x: number; y: number; width: number; height: number }; zIndex: number }> }).frames[0].box) = {
        x: 72,
        y: 96,
        width: 480,
        height: 120,
      };
      (mutatedDocument.layout as { frames: Array<{ zIndex: number }> }).frames[0].zIndex = 2;

      const updateEventPromise = waitForCustomEvent(socket, BRIDGE_UPDATE_EVENT);
      const mutation = await postEditorMutation(url, mutatedDocument);
      expect(mutation.status).toBe(200);
      expect(mutation.payload).toMatchObject({
        ok: true,
        status: 'saved',
        saveState: 'idle',
        workspaceRoot: projectRoot,
        physics: 'design',
        canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
      });
      expect(typeof mutation.payload.savedAt).toBe('string');

      const updateEvent = await updateEventPromise;
      expect(updateEvent).toMatchObject({
        status: 'ready',
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
        configPath: path.join(projectRoot, 'sfrb.config.json'),
      });
      expect(updateEvent.changedPaths).toEqual(expect.arrayContaining([path.join(projectRoot, 'resume.sfrb.json')]));

      const updated = await waitForBootstrapMatch(url, (payload, status) => {
        return status === 200
          && payload.status === 'ready'
          && (payload.document as { metadata?: { title?: string } }).metadata?.title === 'After Mutation';
      });
      expect(updated.payload.document).toMatchObject({
        metadata: { title: 'After Mutation' },
        semantic: {
          blocks: [{ id: 'summaryBlock', text: 'Saved from the browser write contract.' }],
        },
        layout: {
          frames: [
            {
              id: 'summaryFrame',
              pageId: 'pageOne',
              blockId: 'summaryBlock',
              box: { x: 72, y: 96, width: 480, height: 120 },
              zIndex: 2,
            },
          ],
        },
      });

      const diskDocument = await readWorkspaceDocument(projectRoot);
      expect(diskDocument).toMatchObject(updated.payload.document as Record<string, unknown>);
      expect(stderr.join('')).toBe('');
    } finally {
      socket.close();
      await closeBridge(child);
    }
  });

  it('rejects schema-invalid writes with actionable issue paths and leaves the last good bootstrap state intact', async () => {
    const projectRoot = await makeTempProject('sfrb-bridge-contract-schema-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      title: 'Schema Guard',
      blockText: 'Still valid on disk.',
    });

    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const initial = await fetchBootstrap(url);
      expect(initial.status).toBe(200);

      const invalidDocument = structuredClone(initial.payload.document as Record<string, unknown>);
      (invalidDocument.semantic as { blocks: Array<{ text: string }> }).blocks[0].text = '';

      const mutation = await postEditorMutation(url, invalidDocument);
      expect(mutation.status).toBe(422);
      expect(mutation.payload).toMatchObject({
        ok: false,
        status: 'error',
        saveState: 'error',
        code: 'document_invalid',
        workspaceRoot: projectRoot,
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
        configPath: path.join(projectRoot, 'sfrb.config.json'),
        canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
        name: 'DocumentValidationError',
      });
      expect(mutation.payload.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'semantic.blocks.0.text',
            message: expect.stringContaining('required'),
          }),
        ]),
      );
      expect(JSON.stringify(mutation.payload)).not.toContain('OPENAI_API_KEY');

      const afterFailure = await fetchBootstrap(url);
      expect(afterFailure.status).toBe(200);
      expect(afterFailure.payload).toMatchObject(initial.payload);

      const diskDocument = await readWorkspaceDocument(projectRoot);
      expect(diskDocument).toMatchObject(initial.payload.document as Record<string, unknown>);
    } finally {
      await closeBridge(child);
    }
  });

  it('rejects physics-invalid writes path-safely without corrupting the canonical document', async () => {
    const projectRoot = await makeTempProject('sfrb-bridge-contract-physics-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      title: 'Physics Guard',
      blockText: 'Document mode must stay frame-free.',
    });

    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const initial = await fetchBootstrap(url);
      expect(initial.status).toBe(200);
      expect(initial.payload).toMatchObject({ status: 'ready', physics: 'document' });

      const invalidDocument = structuredClone(initial.payload.document as Record<string, unknown>);
      (invalidDocument.layout as { frames: Array<Record<string, unknown>> }).frames = [
        {
          id: 'summaryFrame',
          pageId: 'pageOne',
          blockId: 'summaryBlock',
          box: { x: 48, y: 48, width: 520, height: 88 },
          zIndex: 0,
        },
      ];

      const mutation = await postEditorMutation(url, invalidDocument);
      expect(mutation.status).toBe(409);
      expect(mutation.payload).toMatchObject({
        ok: false,
        status: 'error',
        saveState: 'error',
        code: 'physics_invalid',
        workspaceRoot: projectRoot,
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
        configPath: path.join(projectRoot, 'sfrb.config.json'),
        canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
        name: 'DocumentPhysicsValidationError',
      });
      expect(mutation.payload.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'layout.frames.0',
            message: expect.stringContaining('Document workspaces forbid fixed layout frames'),
          }),
        ]),
      );
      expect(JSON.stringify(mutation.payload)).not.toContain('OPENAI_API_KEY');

      const afterFailure = await fetchBootstrap(url);
      expect(afterFailure.status).toBe(200);
      expect(afterFailure.payload).toMatchObject(initial.payload);
      expect((afterFailure.payload.document as { layout: { frames: unknown[] } }).layout.frames).toEqual([]);

      const diskDocument = await readWorkspaceDocument(projectRoot);
      expect((diskDocument.layout as { frames: unknown[] }).frames).toEqual([]);
    } finally {
      await closeBridge(child);
    }
  });
});
