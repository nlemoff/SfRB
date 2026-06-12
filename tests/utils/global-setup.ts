import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Build once before any worker starts. Test files must never rebuild dist/
// themselves: parallel workers rebuilding while other tests spawn processes
// from dist/ is a race that corrupts mid-flight runs.
export default async function buildDistOnce(): Promise<void> {
  await execFileAsync('npm', ['run', 'build'], {
    cwd: process.cwd(),
    env: process.env,
  });
}
