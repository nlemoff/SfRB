import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createDocumentJsonSchema } from '../dist/document/schema.js';

const schemaPath = path.resolve(process.cwd(), 'schema.json');
const expected = `${JSON.stringify(createDocumentJsonSchema(), null, 2)}\n`;
const actual = await readFile(schemaPath, 'utf8');

if (actual !== expected) {
  console.error(`schema.json is out of date. Run npm run schema:generate.`);
  process.exit(1);
}

console.log('schema.json matches the canonical document schema.');
