import path from 'node:path';

import { getConfigPath, readConfig } from '../../config/store';
import { getDocumentPath, readDocument, writeDocument } from '../store';
import { MissingWorkspaceConfigError, validateDocumentForPhysics } from '../validation';
import type { SfrbDocument } from '../schema';
import { applyEditorOperation } from './apply';
import { parseEditorOperation, type EditorOperation } from './schema';

export type WorkspaceOperationResult = {
  operation: EditorOperation;
  document: SfrbDocument;
  physics: 'document' | 'design';
  documentPath: string;
  configPath: string;
};

// The one shared structured-mutation path: CLI `sfrb edit` and the bridge
// `{operation}` route both run exactly this sequence, so neither can fork the
// validation guarantees of the canonical document.
export async function runWorkspaceOperation(
  projectRoot: string,
  rawOperation: unknown,
): Promise<WorkspaceOperationResult> {
  const resolvedRoot = path.resolve(projectRoot);
  const documentPath = getDocumentPath(resolvedRoot);
  const configPath = getConfigPath(resolvedRoot);

  const operation = parseEditorOperation(rawOperation);
  const document = await readDocument(resolvedRoot);
  const next = applyEditorOperation(document, operation);

  let config;
  try {
    config = await readConfig(resolvedRoot);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;
    if (fileError && typeof fileError === 'object' && fileError.code === 'ENOENT') {
      throw new MissingWorkspaceConfigError(resolvedRoot, documentPath);
    }
    throw error;
  }

  validateDocumentForPhysics(next, config.workspace.physics, documentPath, configPath);
  const written = await writeDocument(next, resolvedRoot);

  return { operation, document: written, physics: config.workspace.physics, documentPath, configPath };
}
