#!/usr/bin/env node
import { Command } from 'commander';

import { createInitCommand } from './commands/init';

export function createCli(): Command {
  const program = new Command();

  program
    .name('sfrb')
    .description('Straightforward Resume Builder CLI')
    .version('0.1.0');

  program.addCommand(createInitCommand());

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
