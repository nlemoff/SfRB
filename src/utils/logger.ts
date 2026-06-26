import process from 'node:process';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const SENSITIVE_KEY = /(api[_-]?key|authorization|auth|token|secret|password|bearer|cookie)/i;

export type LogContext = Record<string, unknown>;

export type LogWriter = (line: string) => void;

function resolveLevel(): LogLevel {
  const raw = (process.env.SFRB_LOG_LEVEL ?? '').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error' || raw === 'silent') {
    return raw;
  }
  // Default to silent so library/CLI/bridge output stays clean unless explicitly
  // opted in via SFRB_LOG_LEVEL. This keeps the bridge's stdout/stderr contract intact.
  return 'silent';
}

/**
 * Recursively masks values stored under secret-like keys so credentials never
 * reach logs, telemetry, or error reports.
 */
export function redactSecrets(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, seen));
  }
  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactSecrets(nested, seen);
    }
    return output;
  }
  return value;
}

/**
 * Minimal dependency-free structured logger. Emits one JSON object per line and
 * carries a bound context (e.g. a requestId) so related lines can be correlated.
 */
export class Logger {
  private readonly base: LogContext;
  private readonly level: LogLevel;
  private readonly write: LogWriter;

  constructor(base: LogContext = {}, level: LogLevel = resolveLevel(), write?: LogWriter) {
    this.base = base;
    this.level = level;
    this.write = write ?? ((line: string) => process.stdout.write(line));
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.base, ...context }, this.level, this.write);
  }

  private emit(level: Exclude<LogLevel, 'silent'>, message: string, context?: LogContext): void {
    if (LEVEL_WEIGHTS[level] < LEVEL_WEIGHTS[this.level]) {
      return;
    }
    const record = {
      ts: new Date().toISOString(),
      level,
      msg: message,
      ...this.base,
      ...(context ?? {}),
    };
    this.write(`${JSON.stringify(redactSecrets(record))}\n`);
  }

  debug(message: string, context?: LogContext): void {
    this.emit('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.emit('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.emit('error', message, context);
  }
}

export const logger = new Logger();
