import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  ensureBuilt,
  makeTempProject,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

type ExportResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

async function runCliExport(
  projectRoot: string,
  outputPath?: string,
): Promise<ExportResult> {
  const args = ['dist/cli.js', 'export', '--cwd', projectRoot, '--port', '0'];
  if (outputPath) {
    args.push('--output', outputPath);
  }

  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout: string[] = [];
  const stderr: string[] = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const exitCode = await new Promise<number>((resolve) => {
    child.once('exit', (code) => resolve(code ?? 1));
  });

  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
}

describe('CLI export command', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('exports a PDF for a clean one-page document workspace', async () => {
    const projectRoot = await makeTempProject('sfrb-export-cli-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      title: 'Export CLI Test',
      blockText: 'Summary for PDF export.',
    });

    const outputPath = path.join(projectRoot, 'test-output.pdf');
    const result = await runCliExport(projectRoot, outputPath);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('PDF exported');

    const fileInfo = await stat(outputPath);
    expect(fileInfo.size).toBeGreaterThan(0);

    const pdfHeader = await readFile(outputPath, 'utf8');
    expect(pdfHeader.startsWith('%PDF')).toBe(true);
  }, 30000);

  it('exports a PDF for a design physics workspace', async () => {
    const projectRoot = await makeTempProject('sfrb-export-design-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Design Export',
      blockText: 'Design layout content.',
    });

    const outputPath = path.join(projectRoot, 'design.pdf');
    const result = await runCliExport(projectRoot, outputPath);

    expect(result.exitCode).toBe(0);

    const fileInfo = await stat(outputPath);
    expect(fileInfo.size).toBeGreaterThan(0);
  }, 30000);

  it('regenerates the PDF on repeated export', async () => {
    const projectRoot = await makeTempProject('sfrb-export-regen-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      blockText: 'First export.',
    });

    const outputPath = path.join(projectRoot, 'resume.pdf');
    const first = await runCliExport(projectRoot, outputPath);
    expect(first.exitCode).toBe(0);
    const firstSize = (await stat(outputPath)).size;

    const second = await runCliExport(projectRoot, outputPath);
    expect(second.exitCode).toBe(0);
    const secondSize = (await stat(outputPath)).size;

    expect(firstSize).toBeGreaterThan(0);
    expect(secondSize).toBeGreaterThan(0);
  }, 60000);

  it('defaults output to resume.pdf in workspace root', async () => {
    const projectRoot = await makeTempProject('sfrb-export-default-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      blockText: 'Default output path test.',
    });

    const result = await runCliExport(projectRoot);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('PDF exported');

    const fileInfo = await stat(path.join(projectRoot, 'resume.pdf'));
    expect(fileInfo.size).toBeGreaterThan(0);
  }, 30000);
}, { timeout: 90000 });
