import { cp, mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/bridge/', import.meta.url), { recursive: true });
await cp(new URL('../src/bridge/server.mjs', import.meta.url), new URL('../dist/bridge/server.mjs', import.meta.url));
