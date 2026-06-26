import path from 'node:path';

import { Command } from 'commander';

import { runOpenCommand, type OpenCommandResult } from './open';

type ExportOptions = {
  cwd?: string;
  output?: string;
  port?: string | number;
};

type ExportCommandRuntime = {
  log?: (message: string) => void;
  error?: (message: string) => void;
};

export type ExportCommandResult = {
  exitCode: number;
  outputPath?: string;
  exportState?: string;
  reason?: string;
};

async function launchPlaywright(): Promise<typeof import('playwright')> {
  try {
    return await import('playwright');
  } catch {
    throw new Error(
      'Playwright is required for PDF export. Install it with: npm install playwright && npx playwright install chromium',
    );
  }
}

export async function runExportCommand(
  options: ExportOptions,
  runtime: ExportCommandRuntime = {},
): Promise<ExportCommandResult> {
  const projectRoot = path.resolve(options.cwd ?? process.cwd());
  const outputPath = path.resolve(options.output ?? path.join(projectRoot, 'resume.pdf'));
  const log = runtime.log ?? ((message: string) => console.log(message));
  const error = runtime.error ?? ((message: string) => console.error(message));

  log(`Exporting workspace: ${projectRoot}`);
  log(`Output: ${outputPath}`);

  let bridgeResult: OpenCommandResult;
  try {
    bridgeResult = await runOpenCommand(
      { cwd: projectRoot, port: options.port ?? 0, open: false },
      { log, error, awaitShutdown: false },
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
    error(`Bridge startup failed: ${message}`);
    return { exitCode: 1, reason: message };
  }

  const child = bridgeResult.child;
  const bridgeUrl = bridgeResult.ready?.url;

  if (!child || !bridgeUrl) {
    error('Bridge did not produce a ready URL.');
    return { exitCode: 1, reason: 'bridge-not-ready' };
  }

  try {
    const pw = await launchPlaywright();
    const browser = await pw.chromium.launch({ headless: true });
    const page = await browser.newPage();

    const artifactUrl = new URL('/print?mode=artifact', bridgeUrl).href;
    log(`Navigating to artifact surface: ${artifactUrl}`);
    await page.goto(artifactUrl, { waitUntil: 'networkidle' });

    await page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        if (!root) return false;
        const state = root.getAttribute('data-export-state');
        return (state !== null && state !== 'blocked') || root.getAttribute('data-blocked-reason') !== 'loading';
      },
      undefined,
      { timeout: 15000 },
    );

    const exportState = await page.getAttribute('#root', 'data-export-state');
    const overflowStatus = await page.getAttribute('#root', 'data-overflow-status');
    const blockedReason = await page.getAttribute('#root', 'data-blocked-reason');
    const riskCount = await page.getAttribute('#root', 'data-risk-count');
    const maxOverflowPx = await page.getAttribute('#root', 'data-max-overflow-px');

    if (exportState === 'blocked') {
      error(`Export blocked: ${blockedReason ?? 'unknown reason'}`);
      await browser.close();
      return {
        exitCode: 1,
        exportState,
        reason: blockedReason ?? 'blocked',
      };
    }

    if (exportState === 'risk') {
      error(`Export denied: ${riskCount} overflow risk(s), max ${maxOverflowPx}px`);
      error('Resolve content overflow before exporting.');
      await browser.close();
      return {
        exitCode: 1,
        exportState,
        reason: `overflow-risk: ${riskCount} risk(s), max ${maxOverflowPx}px`,
      };
    }

    log(`Export state: ${exportState}, overflow: ${overflowStatus}`);
    log('Generating PDF...');

    await page.pdf({
      path: outputPath,
      width: '612px',
      height: '792px',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    });

    log(`PDF exported: ${outputPath}`);
    await browser.close();

    return { exitCode: 0, outputPath, exportState: exportState ?? 'ready' };
  } finally {
    child.kill('SIGTERM');
    await new Promise<void>((resolve) => child.once('exit', () => resolve()));
  }
}

export function createExportCommand(): Command {
  const command = new Command('export');

  command
    .description('Export the current workspace resume as a PDF')
    .option('--cwd <path>', 'Workspace root to export')
    .option('--output <path>', 'Output PDF file path (default: <workspace>/resume.pdf)')
    .option('--port <port>', 'Preferred local port for the bridge', '0')
    .action(async (options: ExportOptions) => {
      try {
        const result = await runExportCommand(options);
        if (result.exitCode !== 0) {
          process.exitCode = result.exitCode;
        }
      } catch (caughtError) {
        process.exitCode = 1;
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        console.error(message);
      }
    });

  return command;
}
