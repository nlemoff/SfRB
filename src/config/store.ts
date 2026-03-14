import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ZodError } from 'zod';

import { parseSfrbConfig, type SfrbConfig } from './schema';

export const SFRB_CONFIG_FILE = 'sfrb.config.json';
export const GITIGNORE_FILE = '.gitignore';

export class ConfigParseError extends Error {
  constructor(source: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : 'Unknown JSON parse failure';
    super(`${source} is not valid JSON: ${detail}`);
    this.name = 'ConfigParseError';
  }
}

export class ConfigValidationError extends Error {
  readonly issues: Array<{ path: string; message: string }>;

  constructor(source: string, error: ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
      message: issue.message,
    }));

    super(
      [`${source} failed validation:`, ...issues.map((issue) => `- ${issue.path}: ${issue.message}`)].join('\n'),
    );

    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export function getConfigPath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, SFRB_CONFIG_FILE);
}

export function getGitignorePath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, GITIGNORE_FILE);
}

export function validateConfig(input: unknown, source = SFRB_CONFIG_FILE): SfrbConfig {
  try {
    return parseSfrbConfig(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ConfigValidationError(source, error);
    }

    throw error;
  }
}

export async function readConfig(projectRoot = process.cwd()): Promise<SfrbConfig> {
  const configPath = getConfigPath(projectRoot);
  const rawFile = await readFile(configPath, 'utf8');

  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(rawFile) as unknown;
  } catch (error) {
    throw new ConfigParseError(configPath, error);
  }

  return validateConfig(rawConfig, configPath);
}

export async function writeConfig(input: unknown, projectRoot = process.cwd()): Promise<SfrbConfig> {
  const configPath = getConfigPath(projectRoot);
  const config = validateConfig(input, configPath);

  await mkdir(projectRoot, { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  return config;
}

export async function ensureConfigIsGitignored(
  projectRoot = process.cwd(),
): Promise<{ path: string; updated: boolean }> {
  const gitignorePath = getGitignorePath(projectRoot);

  let existing = '';
  try {
    existing = await readFile(gitignorePath, 'utf8');
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;
    if (fileError.code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = existing.split(/\r?\n/).map((line) => line.trim());
  const alreadyProtected = lines.includes(SFRB_CONFIG_FILE) || lines.includes(`/${SFRB_CONFIG_FILE}`);

  if (alreadyProtected) {
    return { path: gitignorePath, updated: false };
  }

  const nextContent = existing.length === 0 ? `${SFRB_CONFIG_FILE}\n` : `${existing.replace(/\s*$/u, '')}\n${SFRB_CONFIG_FILE}\n`;

  await mkdir(projectRoot, { recursive: true });
  await writeFile(gitignorePath, nextContent, 'utf8');

  return { path: gitignorePath, updated: true };
}
