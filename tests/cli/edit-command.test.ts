import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeAll, afterEach, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  ensureBuilt,
  makeTempProject,
  readWorkspaceDocument,
  readWorkspaceDocumentRaw,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

async function runCli(args: string[], stdinInput?: string): Promise<CliResult> {
  const child = spawn(process.execPath, ['dist/cli.js', ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: [stdinInput === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
  });

  if (stdinInput !== undefined && child.stdin) {
    child.stdin.write(stdinInput);
    child.stdin.end();
  }

  const stdout: string[] = [];
  const stderr: string[] = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const exitCode = await new Promise<number>((resolve) => {
    child.once('exit', (code) => resolve(code ?? 1));
  });

  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
}

function lockedGroupDocument() {
  return {
    metadata: { title: 'Edit Command', locale: 'en-US' },
    semantic: {
      sections: [{ id: 'heroSection', title: 'Profile', blockIds: ['heroBlock', 'summaryBlock'] }],
      blocks: [
        { id: 'heroBlock', kind: 'heading', text: 'Alex Carter' },
        { id: 'summaryBlock', kind: 'paragraph', text: 'CLI edit coverage.' },
      ],
    },
    layout: {
      pages: [
        { id: 'mainPage', size: { width: 612, height: 792 }, margin: { top: 36, right: 36, bottom: 36, left: 36 } },
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
      ],
      frameGroups: [
        { id: 'heroComposition', pageId: 'mainPage', frameIds: ['heroFrame', 'summaryFrame'], locked: true },
      ],
    },
  };
}

describe('CLI edit command', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('applies an inline --op through the canonical validated write path', async () => {
    const projectRoot = await makeTempProject('sfrb-edit-inline-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', blockText: 'Before edit.' });

    const result = await runCli([
      'edit',
      '--cwd',
      projectRoot,
      '--op',
      JSON.stringify({ op: 'set-block-text', blockId: 'summaryBlock', text: 'After edit.' }),
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('set-block-text');

    const persisted = await readWorkspaceDocument(projectRoot);
    const blocks = (persisted.semantic as { blocks: Array<{ id: string; text: string }> }).blocks;
    expect(blocks.find((block) => block.id === 'summaryBlock')?.text).toBe('After edit.');
  });

  it('reads the operation from --op-file', async () => {
    const projectRoot = await makeTempProject('sfrb-edit-file-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', blockText: 'Before file edit.' });

    const opPath = path.join(projectRoot, 'op.json');
    await writeFile(opPath, JSON.stringify({ op: 'set-title', title: 'Edited From File' }), 'utf8');

    const result = await runCli(['edit', '--cwd', projectRoot, '--op-file', opPath]);

    expect(result.exitCode).toBe(0);

    const persisted = await readWorkspaceDocument(projectRoot);
    expect((persisted.metadata as { title: string }).title).toBe('Edited From File');
  });

  it('reads the operation from stdin when no flag is provided', async () => {
    const projectRoot = await makeTempProject('sfrb-edit-stdin-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', blockText: 'Before stdin edit.' });

    const result = await runCli(
      ['edit', '--cwd', projectRoot],
      JSON.stringify({ op: 'set-section-title', sectionId: 'summary', title: 'Stdin Section' }),
    );

    expect(result.exitCode).toBe(0);

    const persisted = await readWorkspaceDocument(projectRoot);
    const sections = (persisted.semantic as { sections: Array<{ id: string; title: string }> }).sections;
    expect(sections.find((section) => section.id === 'summary')?.title).toBe('Stdin Section');
  });

  it('emits a machine-readable success envelope with --json', async () => {
    const projectRoot = await makeTempProject('sfrb-edit-json-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', blockText: 'JSON envelope.' });

    const result = await runCli([
      'edit',
      '--cwd',
      projectRoot,
      '--json',
      '--op',
      JSON.stringify({ op: 'set-template', templateId: 'modern' }),
    ]);

    expect(result.exitCode).toBe(0);
    const envelope = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(envelope).toMatchObject({
      ok: true,
      code: 'saved',
      op: 'set-template',
      writeOutcome: 'written',
      documentPath: path.join(projectRoot, 'resume.sfrb.json'),
      configPath: path.join(projectRoot, 'sfrb.config.json'),
    });
  });

  it('reports locked-member rejections as no_write with exit 1 and leaves the document byte-stable', async () => {
    const projectRoot = await makeTempProject('sfrb-edit-locked-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design' });
    await writeFile(
      path.join(projectRoot, 'resume.sfrb.json'),
      `${JSON.stringify(lockedGroupDocument(), null, 2)}\n`,
      'utf8',
    );
    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);

    const result = await runCli([
      'edit',
      '--cwd',
      projectRoot,
      '--json',
      '--op',
      JSON.stringify({ op: 'set-frame-box', frameId: 'heroFrame', box: { x: 0, y: 0, width: 50, height: 50 } }),
    ]);

    expect(result.exitCode).toBe(1);
    const envelope = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(envelope).toMatchObject({
      ok: false,
      code: 'operation_invalid',
      op: 'set-frame-box',
      writeOutcome: 'no_write',
    });
    expect(Array.isArray(envelope.issues)).toBe(true);

    expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
  });

  it('lists every operation kind with --list-ops', async () => {
    const result = await runCli(['edit', '--list-ops']);

    expect(result.exitCode).toBe(0);
    for (const kind of [
      'set-title',
      'set-section-title',
      'set-template',
      'set-block-text',
      'insert-block',
      'remove-block',
      'split-block',
      'set-frame-box',
      'move-group',
      'group-frames',
      'ungroup-frames',
      'set-group-locked',
      'reconcile-freeform',
    ]) {
      expect(result.stdout).toContain(kind);
    }
  });

  it('rejects ambiguous input sources', async () => {
    const projectRoot = await makeTempProject('sfrb-edit-ambiguous-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design' });

    const result = await runCli([
      'edit',
      '--cwd',
      projectRoot,
      '--op',
      '{"op":"set-title","title":"X"}',
      '--op-file',
      'op.json',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('exactly one');
  });
});
