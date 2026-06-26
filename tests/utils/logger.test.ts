import { describe, expect, it } from 'vitest';

import { Logger, redactSecrets } from '../../src/utils/logger';

describe('redactSecrets', () => {
  it('masks values stored under secret-like keys', () => {
    const result = redactSecrets({
      provider: 'deepseek',
      apiKey: 'sk-live-123',
      nested: { authorization: 'Bearer abc', safe: 'value' },
    });

    expect(result).toEqual({
      provider: 'deepseek',
      apiKey: '[REDACTED]',
      nested: { authorization: '[REDACTED]', safe: 'value' },
    });
  });

  it('recurses into arrays and tolerates circular references', () => {
    const circular: Record<string, unknown> = { token: 'secret' };
    circular.self = circular;

    const result = redactSecrets([{ password: 'p' }, circular]) as Array<Record<string, unknown>>;

    expect(result[0]).toEqual({ password: '[REDACTED]' });
    expect(result[1].token).toBe('[REDACTED]');
    expect(result[1].self).toBe('[Circular]');
  });
});

describe('Logger', () => {
  function capture() {
    const lines: string[] = [];
    return { lines, write: (line: string) => lines.push(line) };
  }

  it('emits structured JSON with bound context and redaction', () => {
    const { lines, write } = capture();
    const log = new Logger({ component: 'bridge' }, 'info', write).child({ requestId: 'r1' });

    log.info('request completed', { apiKey: 'sk-live', status: 200 });

    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]);
    expect(record).toMatchObject({
      level: 'info',
      msg: 'request completed',
      component: 'bridge',
      requestId: 'r1',
      apiKey: '[REDACTED]',
      status: 200,
    });
    expect(typeof record.ts).toBe('string');
  });

  it('suppresses entries below the configured level', () => {
    const { lines, write } = capture();
    const log = new Logger({}, 'warn', write);

    log.debug('debug');
    log.info('info');
    log.warn('warn');
    log.error('error');

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).level).toBe('warn');
    expect(JSON.parse(lines[1]).level).toBe('error');
  });

  it('writes nothing when silent', () => {
    const { lines, write } = capture();
    const log = new Logger({}, 'silent', write);

    log.error('should not appear');

    expect(lines).toHaveLength(0);
  });
});
