import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReliabilityMonitorService {
  private readonly logger = new Logger('ReliabilityMonitor');
  private readonly counters = new Map<string, number>();

  record(event: string, metadata: Record<string, unknown> = {}) {
    this.counters.set(event, (this.counters.get(event) ?? 0) + 1);
    this.logger.log(JSON.stringify({ event, count: this.counters.get(event), ...metadata }));
  }

  failure(event: string, error: unknown, metadata: Record<string, unknown> = {}) {
    const message = error instanceof Error ? error.message : String(error);
    this.counters.set(event, (this.counters.get(event) ?? 0) + 1);
    this.logger.error(JSON.stringify({ event, count: this.counters.get(event), message, ...metadata }));
  }

  snapshot() {
    return Object.fromEntries(this.counters.entries());
  }
}
