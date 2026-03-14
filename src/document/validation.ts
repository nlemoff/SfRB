import path from 'node:path';

import type { PhysicsMode } from '../config/schema';
import { getConfigPath, readConfig } from '../config/store';
import { type SfrbDocument } from './schema';

const SFRB_DOCUMENT_FILE = 'resume.sfrb.json';

export type DocumentValidationIssue = {
  path: string;
  message: string;
};

export class MissingWorkspaceConfigError extends Error {
  readonly configPath: string;
  readonly documentPath: string;

  constructor(projectRoot: string, documentPath = path.join(projectRoot, SFRB_DOCUMENT_FILE)) {
    const configPath = getConfigPath(projectRoot);
    super(
      `Cannot validate ${documentPath} against workspace physics because ${configPath} does not exist. Run \`sfrb init\` first or add the workspace config file.`,
    );
    this.name = 'MissingWorkspaceConfigError';
    this.configPath = configPath;
    this.documentPath = documentPath;
  }
}

export class DocumentPhysicsValidationError extends Error {
  readonly issues: DocumentValidationIssue[];
  readonly physics: PhysicsMode;
  readonly configPath: string;
  readonly documentPath: string;

  constructor(params: {
    physics: PhysicsMode;
    configPath: string;
    documentPath: string;
    issues: DocumentValidationIssue[];
  }) {
    const { physics, configPath, documentPath, issues } = params;
    super(
      [
        `${documentPath} failed ${physics} workspace validation (workspace config: ${configPath}):`,
        ...issues.map((issue) => `- ${issue.path}: ${issue.message}`),
      ].join('\n'),
    );

    this.name = 'DocumentPhysicsValidationError';
    this.issues = issues;
    this.physics = physics;
    this.configPath = configPath;
    this.documentPath = documentPath;
  }
}

function formatIssuePath(pathParts: Array<string | number>): string {
  return pathParts.length > 0 ? pathParts.join('.') : '(root)';
}

export function validateDocumentForPhysics(
  document: SfrbDocument,
  physics: PhysicsMode,
  documentPath = SFRB_DOCUMENT_FILE,
  configPath = getConfigPath(process.cwd()),
): SfrbDocument {
  const issues: DocumentValidationIssue[] = [];

  if (physics === 'document') {
    document.layout.frames.forEach((frame, frameIndex) => {
      issues.push({
        path: formatIssuePath(['layout', 'frames', frameIndex]),
        message: `Document workspaces forbid fixed layout frames like "${frame.id}". Remove layout.frames.${frameIndex} or switch workspace.physics to "design" in ${configPath}.`,
      });
    });
  }

  if (physics === 'design') {
    const framedBlockIds = new Set(document.layout.frames.map((frame) => frame.blockId));

    document.semantic.blocks.forEach((block, blockIndex) => {
      if (!framedBlockIds.has(block.id)) {
        issues.push({
          path: formatIssuePath(['semantic', 'blocks', blockIndex, 'id']),
          message: `Design workspaces require a layout frame for semantic block "${block.id}". Add a linked layout.frames entry or switch workspace.physics to "document" in ${configPath}.`,
        });
      }
    });
  }

  if (issues.length > 0) {
    throw new DocumentPhysicsValidationError({
      physics,
      configPath,
      documentPath,
      issues,
    });
  }

  return document;
}

export async function readAndValidateDocument(projectRoot = process.cwd()): Promise<SfrbDocument> {
  const { readDocument } = await import('./store');

  let config;
  try {
    config = await readConfig(projectRoot);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;
    if (fileError.code === 'ENOENT') {
      throw new MissingWorkspaceConfigError(projectRoot);
    }
    throw error;
  }

  const documentPath = path.join(projectRoot, SFRB_DOCUMENT_FILE);
  const document = await readDocument(projectRoot);

  return validateDocumentForPhysics(document, config.workspace.physics, documentPath, getConfigPath(projectRoot));
}
