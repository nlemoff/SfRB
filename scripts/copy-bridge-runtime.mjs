import { copyFile, mkdir, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const bridgeDir = new URL('../dist/bridge/', import.meta.url);
const source = new URL('../src/bridge/server.mjs', import.meta.url);
const target = new URL('../dist/bridge/server.mjs', import.meta.url);
const tempTarget = new URL(`../dist/bridge/server.mjs.${process.pid}.${randomUUID()}.tmp`, import.meta.url);

await mkdir(bridgeDir, { recursive: true });

try {
  await copyFile(source, tempTarget);
  await rename(tempTarget, target);
} catch (error) {
  await rm(tempTarget, { force: true }).catch(() => undefined);
  throw error;
}
