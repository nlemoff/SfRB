import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Command } from 'commander';

import {
  EDITOR_OPERATION_KINDS,
  OperationApplicationError,
  OperationParseError,
  runWorkspaceOperation,
  type EditorOperationKind,
} from '../document/operations';
import { getConfigPath } from '../config/store';
import { getDocumentPath, DocumentParseError, DocumentValidationError } from '../document/store';
import { DocumentPhysicsValidationError, MissingWorkspaceConfigError } from '../document/validation';

type EditCommandRuntime = {
  log?: (message: string) => void;
  error?: (message: string) => void;
  readStdin?: () => Promise<string | null>;
};

type EditOptions = {
  cwd?: string;
  op?: string;
  opFile?: string;
  json?: boolean;
  listOps?: boolean;
};

export type EditCommandResult = {
  exitCode: number;
};

type EditFailureCode = 'request_invalid' | 'operation_invalid' | 'document_invalid' | 'physics_invalid' | 'persistence_failed';

type EditEnvelope = {
  ok: boolean;
  code: 'saved' | EditFailureCode;
  op: EditorOperationKind | null;
  writeOutcome: 'written' | 'no_write';
  documentPath: string;
  configPath: string;
  message?: string;
  issues?: Array<{ path: string; message: string }>;
};

const OPERATION_USAGE: Record<EditorOperationKind, string> = {
  'set-title': '{"op":"set-title","title":"..."}',
  'set-section-title': '{"op":"set-section-title","sectionId":"...","title":"..."}',
  'set-template': '{"op":"set-template","templateId":"default|classic|modern"}',
  'set-block-text': '{"op":"set-block-text","blockId":"...","text":"..."}',
  'insert-block': '{"op":"insert-block","sectionId":"...","index":0,"block":{"id","kind","text"},"frame":{...}}',
  'remove-block': '{"op":"remove-block","blockId":"..."}',
  'split-block': '{"op":"split-block","blockId":"...","segments":[{"id","text"},...],"frames":[{...}]}',
  'set-frame-box': '{"op":"set-frame-box","frameId":"...","box":{"x","y","width","height"},"asFreeform":true?}',
  'move-group': '{"op":"move-group","groupId":"...","dx":0,"dy":0}',
  'group-frames': '{"op":"group-frames","groupId":"...","frameIds":["...","..."],"locked":false}',
  'ungroup-frames': '{"op":"ungroup-frames","groupId":"..."}',
  'set-group-locked': '{"op":"set-group-locked","groupId":"...","locked":true}',
  'reconcile-freeform': '{"op":"reconcile-freeform","outcome":"rejoin_layout|keep_locked","frameIds":["..."]}',
};

async function defaultReadStdin(): Promise<string | null> {
  if (process.stdin.isTTY) {
    return null;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function classifyFailure(caught: unknown): { code: EditFailureCode; op: EditorOperationKind | null } {
  if (caught instanceof OperationApplicationError) {
    return { code: 'operation_invalid', op: caught.operationKind };
  }
  if (caught instanceof OperationParseError) {
    return { code: 'operation_invalid', op: null };
  }
  if (caught instanceof DocumentPhysicsValidationError) {
    return { code: 'physics_invalid', op: null };
  }
  if (
    caught instanceof MissingWorkspaceConfigError ||
    caught instanceof DocumentParseError ||
    caught instanceof DocumentValidationError
  ) {
    return { code: 'document_invalid', op: null };
  }
  return { code: 'persistence_failed', op: null };
}

function getFailureIssues(caught: unknown): Array<{ path: string; message: string }> | undefined {
  if (caught && typeof caught === 'object' && 'issues' in caught && Array.isArray(caught.issues)) {
    return caught.issues as Array<{ path: string; message: string }>;
  }
  return undefined;
}

async function resolveRawOperation(
  options: EditOptions,
  readStdin: () => Promise<string | null>,
): Promise<{ ok: true; raw: string } | { ok: false; message: string }> {
  const sources = [options.op !== undefined, options.opFile !== undefined].filter(Boolean).length;
  if (sources > 1) {
    return { ok: false, message: 'Provide exactly one operation source: --op, --op-file, or stdin.' };
  }

  if (options.op !== undefined) {
    return { ok: true, raw: options.op };
  }

  if (options.opFile !== undefined) {
    try {
      return { ok: true, raw: await readFile(path.resolve(options.opFile), 'utf8') };
    } catch (caught) {
      return { ok: false, message: `Could not read --op-file: ${caught instanceof Error ? caught.message : String(caught)}` };
    }
  }

  const fromStdin = await readStdin();
  if (fromStdin === null || fromStdin.trim().length === 0) {
    return { ok: false, message: 'Provide exactly one operation source: --op, --op-file, or stdin.' };
  }
  return { ok: true, raw: fromStdin };
}

export async function runEditCommand(options: EditOptions, runtime: EditCommandRuntime = {}): Promise<EditCommandResult> {
  const log = runtime.log ?? ((message: string) => console.log(message));
  const error = runtime.error ?? ((message: string) => console.error(message));
  const readStdin = runtime.readStdin ?? defaultReadStdin;

  if (options.listOps) {
    for (const kind of EDITOR_OPERATION_KINDS) {
      log(`${kind}\t${OPERATION_USAGE[kind]}`);
    }
    return { exitCode: 0 };
  }

  const projectRoot = path.resolve(options.cwd ?? process.cwd());
  const documentPath = getDocumentPath(projectRoot);
  const configPath = getConfigPath(projectRoot);

  const emit = (envelope: EditEnvelope): void => {
    if (options.json) {
      log(JSON.stringify(envelope, null, 2));
      return;
    }

    if (envelope.ok) {
      log(`Applied ${envelope.op} to ${envelope.documentPath}`);
      return;
    }

    error(envelope.message ?? 'Edit failed.');
  };

  const rawSource = await resolveRawOperation(options, readStdin);
  if (!rawSource.ok) {
    emit({
      ok: false,
      code: 'request_invalid',
      op: null,
      writeOutcome: 'no_write',
      documentPath,
      configPath,
      message: rawSource.message,
      issues: [{ path: '(input)', message: rawSource.message }],
    });
    return { exitCode: 1 };
  }

  let rawOperation: unknown;
  try {
    rawOperation = JSON.parse(rawSource.raw) as unknown;
  } catch (caught) {
    const message = `Operation input is not valid JSON: ${caught instanceof Error ? caught.message : String(caught)}`;
    emit({
      ok: false,
      code: 'operation_invalid',
      op: null,
      writeOutcome: 'no_write',
      documentPath,
      configPath,
      message,
      issues: [{ path: '(input)', message }],
    });
    return { exitCode: 1 };
  }

  try {
    const result = await runWorkspaceOperation(projectRoot, rawOperation);
    emit({
      ok: true,
      code: 'saved',
      op: result.operation.op,
      writeOutcome: 'written',
      documentPath: result.documentPath,
      configPath: result.configPath,
    });
    return { exitCode: 0 };
  } catch (caught) {
    const { code, op } = classifyFailure(caught);
    emit({
      ok: false,
      code,
      op,
      writeOutcome: 'no_write',
      documentPath,
      configPath,
      message: caught instanceof Error ? caught.message : String(caught),
      issues: getFailureIssues(caught),
    });
    return { exitCode: 1 };
  }
}

export function createEditCommand(): Command {
  return new Command('edit')
    .description('Apply a structured editor operation through the canonical validated write path')
    .option('--cwd <path>', 'Workspace root (defaults to current directory)')
    .option('--op <json>', 'Operation as an inline JSON string')
    .option('--op-file <path>', 'Read the operation JSON from a file')
    .option('--json', 'Emit a machine-readable result envelope')
    .option('--list-ops', 'List the supported operation kinds and exit')
    .addHelpText(
      'after',
      '\nExamples:\n  sfrb edit --op \'{"op":"set-block-text","blockId":"summaryBlock","text":"New text"}\'\n  sfrb edit --op-file ./operation.json --json\n  echo \'{"op":"set-title","title":"My Resume"}\' | sfrb edit\n  sfrb edit --list-ops',
    )
    .action(async (options: EditOptions) => {
      const result = await runEditCommand(options);
      if (result.exitCode !== 0) {
        process.exitCode = result.exitCode;
      }
    });
}
