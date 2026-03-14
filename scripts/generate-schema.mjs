import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createDocumentJsonSchema } from '../dist/document/schema.js';

const schemaPath = path.resolve(process.cwd(), 'schema.json');
const schema = createDocumentJsonSchema();

await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
console.log(`Generated ${schemaPath}`);
