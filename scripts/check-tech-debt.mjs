#!/usr/bin/env node
// Tech-debt scanner: every TODO/FIXME/HACK/XXX marker must carry a tracking
// reference (an issue id or owner) so debt is discoverable, e.g. TODO(#123).
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOTS = ['src', 'web/src', 'scripts', 'tests'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js']);
const MARKER = /\b(TODO|FIXME|HACK|XXX)\b(?!\()/;
const SELF = 'check-tech-debt.mjs';

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
    if (entry.name === SELF) {
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
      contents.split('\n').forEach((line, index) => {
        if (MARKER.test(line)) {
          offenders.push(`${path.relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }

  if (offenders.length > 0) {
    console.error('Untracked tech-debt markers found. Add a reference, e.g. TODO(#123):');
    for (const offender of offenders) {
      console.error(`  ${offender}`);
    }
    process.exit(1);
  }

  console.log('Tech-debt scan passed: no untracked TODO/FIXME/HACK/XXX markers.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
