#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Command } from 'commander';

import { createExportCommand } from './commands/export';
import { createInitCommand } from './commands/init';
import { createOpenCommand } from './commands/open';
import { createTemplateCommand } from './commands/template';

function readCliVersion(): string {
  // Resolved relative to the compiled entry (dist/cli.js), so the same path
  // works in the repo and in an installed package layout.
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
  return packageJson.version ?? '0.0.0';
}

export function createCli(): Command {
  const program = new Command();

  program
    .name('sfrb')
    .description('Straightforward Resume Builder CLI')
    .version(readCliVersion());

  program.addCommand(createExportCommand());
  program.addCommand(createInitCommand());
  program.addCommand(createOpenCommand());
  program.addCommand(createTemplateCommand());

  return program;
}

export async function run(argv = process.argv): Promise<void> {
  await createCli().parseAsync(argv);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
