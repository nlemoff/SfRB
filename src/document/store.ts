import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ZodError } from 'zod';

import { parseDocument, type SfrbDocument } from './schema';
import { readAndValidateDocument } from './validation';

export const SFRB_DOCUMENT_FILE = 'resume.sfrb.json';

export class DocumentParseError extends Error {
  constructor(source: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : 'Unknown JSON parse failure';
    super(`${source} is not valid JSON: ${detail}`);
    this.name = 'DocumentParseError';
  }
}

export class DocumentValidationError extends Error {
  readonly issues: Array<{ path: string; message: string }>;

  constructor(source: string, error: ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
      message: issue.message,
    }));

    super(
      [`${source} failed validation:`, ...issues.map((issue) => `- ${issue.path}: ${issue.message}`)].join('\n'),
    );

    this.name = 'DocumentValidationError';
    this.issues = issues;
  }
}

export function getDocumentPath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, SFRB_DOCUMENT_FILE);
}

export function validateDocument(input: unknown, source = SFRB_DOCUMENT_FILE): SfrbDocument {
  try {
    return parseDocument(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new DocumentValidationError(source, error);
    }

    throw error;
  }
}

export async function readDocument(projectRoot = process.cwd()): Promise<SfrbDocument> {
  const documentPath = getDocumentPath(projectRoot);
  const rawFile = await readFile(documentPath, 'utf8');

  let rawDocument: unknown;
  try {
    rawDocument = JSON.parse(rawFile) as unknown;
  } catch (error) {
    throw new DocumentParseError(documentPath, error);
  }

  return validateDocument(rawDocument, documentPath);
}

export async function readWorkspaceDocument(projectRoot = process.cwd()): Promise<SfrbDocument> {
  return readAndValidateDocument(projectRoot);
}

export async function writeDocument(input: unknown, projectRoot = process.cwd()): Promise<SfrbDocument> {
  const documentPath = getDocumentPath(projectRoot);
  const document = validateDocument(input, documentPath);

  await mkdir(projectRoot, { recursive: true });
  await writeFile(documentPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  return document;
}
