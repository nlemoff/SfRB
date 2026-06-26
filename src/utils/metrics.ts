type Labels = Record<string, string>;

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function seriesKey(labels: Labels): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([key, value]) => `${key}="${escapeLabelValue(value)}"`).join(',');
}

function renderName(name: string, labelKey: string): string {
  return labelKey.length > 0 ? `${name}{${labelKey}}` : name;
}

/**
 * Tiny dependency-free metrics registry that renders Prometheus text exposition.
 * Counters track request volume; the sum/count pair gives average request
 * latency without shipping a full histogram dependency.
 */
export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly durationSum = new Map<string, number>();
  private readonly durationCount = new Map<string, number>();

  incrementCounter(labels: Labels, amount = 1): void {
    const key = seriesKey(labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + amount);
  }

  observeDuration(labels: Labels, seconds: number): void {
    const key = seriesKey(labels);
    this.durationSum.set(key, (this.durationSum.get(key) ?? 0) + seconds);
    this.durationCount.set(key, (this.durationCount.get(key) ?? 0) + 1);
  }

  /** Records one completed bridge request (volume + latency). */
  recordRequest(route: string, status: number, durationSeconds: number): void {
    this.incrementCounter({ route, status: String(status) });
    this.observeDuration({ route }, durationSeconds);
  }

  render(): string {
    const lines: string[] = [];

    lines.push('# HELP sfrb_bridge_requests_total Total bridge HTTP requests by route and status.');
    lines.push('# TYPE sfrb_bridge_requests_total counter');
    for (const [key, value] of this.counters) {
      lines.push(`${renderName('sfrb_bridge_requests_total', key)} ${value}`);
    }

    lines.push('# HELP sfrb_bridge_request_duration_seconds Bridge request latency by route.');
    lines.push('# TYPE sfrb_bridge_request_duration_seconds summary');
    for (const [key, sum] of this.durationSum) {
      lines.push(`${renderName('sfrb_bridge_request_duration_seconds_sum', key)} ${sum}`);
    }
    for (const [key, count] of this.durationCount) {
      lines.push(`${renderName('sfrb_bridge_request_duration_seconds_count', key)} ${count}`);
    }

    return `${lines.join('\n')}\n`;
  }

  reset(): void {
    this.counters.clear();
    this.durationSum.clear();
    this.durationCount.clear();
  }
}

export const metrics = new MetricsRegistry();
