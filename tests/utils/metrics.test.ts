import { describe, expect, it } from 'vitest';

import { MetricsRegistry } from '../../src/utils/metrics';

describe('MetricsRegistry', () => {
  it('records request volume and latency in Prometheus exposition format', () => {
    const registry = new MetricsRegistry();
    registry.recordRequest('/__sfrb/editor', 200, 0.5);
    registry.recordRequest('/__sfrb/editor', 200, 0.5);
    registry.recordRequest('/__sfrb/editor', 422, 0.1);

    const output = registry.render();

    expect(output).toContain('# TYPE sfrb_bridge_requests_total counter');
    expect(output).toContain('sfrb_bridge_requests_total{route="/__sfrb/editor",status="200"} 2');
    expect(output).toContain('sfrb_bridge_requests_total{route="/__sfrb/editor",status="422"} 1');
    expect(output).toContain('sfrb_bridge_request_duration_seconds_sum{route="/__sfrb/editor"} 1.1');
    expect(output).toContain('sfrb_bridge_request_duration_seconds_count{route="/__sfrb/editor"} 3');
  });

  it('sorts and escapes label values deterministically', () => {
    const registry = new MetricsRegistry();
    registry.incrementCounter({ route: 'a"b', status: '200' });

    expect(registry.render()).toContain('sfrb_bridge_requests_total{route="a\\"b",status="200"} 1');
  });

  it('clears all series on reset', () => {
    const registry = new MetricsRegistry();
    registry.recordRequest('/__sfrb/health', 200, 0.01);
    registry.reset();

    const output = registry.render();
    expect(output).not.toContain('/__sfrb/health');
  });
});
