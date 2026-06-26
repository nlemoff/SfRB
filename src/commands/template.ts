import path from 'node:path';

import { Command } from 'commander';

import { readConfig } from '../config/store';
import { readDocument, writeDocument } from '../document/store';
import {
  TEMPLATE_IDS,
  TEMPLATE_VERSIONS,
  currentTemplateMetadata,
  isKnownTemplateId,
  type TemplateId,
} from '../document/templates/registry';
import { validateDocumentForPhysics } from '../document/validation';

type TemplateCommandRuntime = {
  log?: (message: string) => void;
  error?: (message: string) => void;
};

type CwdOptions = {
  cwd?: string;
};

type ApplyOptions = CwdOptions;

type ShowOptions = CwdOptions;

type ListOptions = CwdOptions;

export type TemplateCommandResult = {
  exitCode: number;
};

function resolveProjectRoot(options: CwdOptions): string {
  return path.resolve(options.cwd ?? process.cwd());
}

export async function runTemplateListCommand(
  _options: ListOptions,
  runtime: TemplateCommandRuntime = {},
): Promise<TemplateCommandResult> {
  const log = runtime.log ?? ((message: string) => console.log(message));

  for (const id of TEMPLATE_IDS) {
    log(`${id}\t${TEMPLATE_VERSIONS[id]}`);
  }

  return { exitCode: 0 };
}

export async function runTemplateShowCommand(
  templateId: string,
  _options: ShowOptions,
  runtime: TemplateCommandRuntime = {},
): Promise<TemplateCommandResult> {
  const log = runtime.log ?? ((message: string) => console.log(message));
  const error = runtime.error ?? ((message: string) => console.error(message));

  if (!isKnownTemplateId(templateId)) {
    error(`Unknown template id "${templateId}". Run \`sfrb template list\` to see registered templates.`);
    return { exitCode: 1 };
  }

  const metadata = currentTemplateMetadata(templateId);
  log(JSON.stringify(metadata, null, 2));
  return { exitCode: 0 };
}

export async function runTemplateApplyCommand(
  templateId: string,
  options: ApplyOptions,
  runtime: TemplateCommandRuntime = {},
): Promise<TemplateCommandResult> {
  const log = runtime.log ?? ((message: string) => console.log(message));
  const error = runtime.error ?? ((message: string) => console.error(message));

  if (!isKnownTemplateId(templateId)) {
    error(`Unknown template id "${templateId}". Run \`sfrb template list\` to see registered templates.`);
    return { exitCode: 1 };
  }

  const projectRoot = resolveProjectRoot(options);

  let config;
  try {
    config = await readConfig(projectRoot);
  } catch (caught) {
    error(formatError('Could not load workspace config', caught));
    return { exitCode: 1 };
  }

  let document;
  try {
    document = await readDocument(projectRoot);
  } catch (caught) {
    error(formatError('Could not load workspace document', caught));
    return { exitCode: 1 };
  }

  const updated = applyTemplateMetadata(document, templateId);

  try {
    validateDocumentForPhysics(updated, config.workspace.physics, path.join(projectRoot, 'resume.sfrb.json'));
    await writeDocument(updated, projectRoot);
  } catch (caught) {
    error(formatError('Could not persist template selection', caught));
    return { exitCode: 1 };
  }

  log(`Applied template ${templateId} (version ${TEMPLATE_VERSIONS[templateId]}) to ${projectRoot}`);
  return { exitCode: 0 };
}

function applyTemplateMetadata<T extends { metadata: { template?: { id: TemplateId; version: string } } }>(
  document: T,
  templateId: TemplateId,
): T {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      template: currentTemplateMetadata(templateId),
    },
  };
}

function formatError(prefix: string, caught: unknown): string {
  if (caught instanceof Error) {
    return `${prefix}: ${caught.message}`;
  }
  return `${prefix}: ${String(caught)}`;
}

export function createTemplateCommand(): Command {
  const command = new Command('template').description('Manage the active resume template');

  command
    .command('list')
    .description('List the templates registered with this build')
    .option('--cwd <path>', 'Workspace root (defaults to current directory)')
    .action(async (options: ListOptions) => {
      const result = await runTemplateListCommand(options);
      if (result.exitCode !== 0) {
        process.exitCode = result.exitCode;
      }
    });

  command
    .command('show <templateId>')
    .description('Print the metadata for a registered template as JSON')
    .option('--cwd <path>', 'Workspace root (defaults to current directory)')
    .action(async (templateId: string, options: ShowOptions) => {
      const result = await runTemplateShowCommand(templateId, options);
      if (result.exitCode !== 0) {
        process.exitCode = result.exitCode;
      }
    });

  command
    .command('apply <templateId>')
    .description('Persist metadata.template through the canonical write path')
    .option('--cwd <path>', 'Workspace root (defaults to current directory)')
    .action(async (templateId: string, options: ApplyOptions) => {
      const result = await runTemplateApplyCommand(templateId, options);
      if (result.exitCode !== 0) {
        process.exitCode = result.exitCode;
      }
    });

  return command;
}
