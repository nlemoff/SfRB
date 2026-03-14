import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { createDocumentJsonSchema } from '../../src/document/schema';
import { getDocumentPath, readDocument, writeDocument } from '../../src/document/store';

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-document-'));
  tempDirs.push(dir);
  return dir;
}

function createValidDocument() {
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
          blockIds: ['summary-block'],
        },
      ],
      blocks: [
        {
          id: 'summary-block',
          kind: 'paragraph',
          text: 'Builds careful local-first tooling.',
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
      frames: [
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
      ],
    },
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('document schema contract', () => {
  it('rejects unknown keys through the real file boundary', async () => {
    const projectRoot = await makeTempProject();
    const documentPath = getDocumentPath(projectRoot);
    const invalid = {
      ...createValidDocument(),
      metadata: {
        ...createValidDocument().metadata,
        unexpected: true,
      },
    };

    await writeFile(documentPath, `${JSON.stringify(invalid, null, 2)}\n`, 'utf8');

    await expect(readDocument(projectRoot)).rejects.toThrowError(/metadata.*unexpected/i);
    await expect(readDocument(projectRoot)).rejects.toThrowError(/unrecognized key/i);
  });

  it('rejects broken semantic-to-layout links', async () => {
    const projectRoot = await makeTempProject();
    const documentPath = getDocumentPath(projectRoot);
    const invalid = createValidDocument();
    invalid.layout.frames[0].blockId = 'missing-block';

    await writeFile(documentPath, `${JSON.stringify(invalid, null, 2)}\n`, 'utf8');

    await expect(readDocument(projectRoot)).rejects.toThrowError(/layout\.frames\.0\.blockId/);
    await expect(readDocument(projectRoot)).rejects.toThrowError(/missing semantic block/i);
  });

  it('surfaces invalid JSON with document-path context', async () => {
    const projectRoot = await makeTempProject();
    const documentPath = getDocumentPath(projectRoot);

    await writeFile(documentPath, '{\n  "metadata": ', 'utf8');

    await expect(readDocument(projectRoot)).rejects.toThrowError(/resume\.sfrb\.json is not valid json/i);
  });

  it('writes and reads the stable workspace document file boundary', async () => {
    const projectRoot = await makeTempProject();
    const written = await writeDocument(createValidDocument(), projectRoot);

    expect(path.basename(getDocumentPath(projectRoot))).toBe('resume.sfrb.json');
    expect(written.version).toBe(1);

    const persisted = await readFile(getDocumentPath(projectRoot), 'utf8');
    expect(persisted).toContain('"version": 1');
    expect(persisted.endsWith('\n')).toBe(true);

    await expect(readDocument(projectRoot)).resolves.toEqual(written);
  });

  it('keeps schema.json aligned with the canonical runtime schema', async () => {
    const schemaPath = path.resolve(process.cwd(), 'schema.json');
    const expected = `${JSON.stringify(createDocumentJsonSchema(), null, 2)}\n`;
    const actual = await readFile(schemaPath, 'utf8');

    expect(actual).toBe(expected);

    const { stdout } = await execFileAsync('npm', ['run', 'schema:check'], {
      cwd: process.cwd(),
    });

    expect(stdout).toMatch(/matches the canonical document schema/i);
  });
});
