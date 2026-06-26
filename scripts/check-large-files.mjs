#!/usr/bin/env node
// Large-file guard: keeps source files small enough for agents and reviewers to
// reason about. Fails CI when a tracked source file exceeds the limits below.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOTS = ['src', 'web/src', 'scripts', 'tests'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js']);
const MAX_LINES = 1200;
const MAX_BYTES = 1024 * 1024;

async function collectFiles(root) {
  const absoluteRoot = path.resolve(root);
  let entries;
  try {
    entries = await readdir(absoluteRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

async function main() {
  const offenders = [];
  for (const root of ROOTS) {
    const files = await collectFiles(root);
    for (const file of files) {
      const info = await stat(file);
      if (!info.isFile()) {
        continue;
      }
      const contents = await readFile(file, 'utf8');
      const lineCount = contents.split('\n').length;
      const relative = path.relative(process.cwd(), file);
      if (lineCount > MAX_LINES) {
        offenders.push(`${relative}: ${lineCount} lines (limit ${MAX_LINES})`);
      }
      if (info.size > MAX_BYTES) {
        offenders.push(`${relative}: ${info.size} bytes (limit ${MAX_BYTES})`);
      }
    }
  }

  if (offenders.length > 0) {
    console.error('Large source files detected. Split them into smaller modules:');
    for (const offender of offenders) {
      console.error(`  ${offender}`);
    }
    process.exit(1);
  }

  console.log(`Large-file guard passed: all source files within ${MAX_LINES} lines / ${MAX_BYTES} bytes.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
