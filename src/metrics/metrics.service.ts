import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  readonly apiRequestCounter: Counter<string>;
  readonly apiLatencyHistogram: Histogram<string>;
  readonly webhookEventsCounter: Counter<string>;
  readonly queueJobsProcessedCounter: Counter<string>;
  readonly queueJobDurationHistogram: Histogram<string>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.apiRequestCounter = new Counter({
      name: 'api_requests_total',
      help: 'Total API requests received',
      labelNames: ['route', 'method', 'status'],
      registers: [this.registry],
    });

    this.apiLatencyHistogram = new Histogram({
      name: 'api_request_duration_seconds',
      help: 'API request latency in seconds',
      labelNames: ['route', 'method', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.webhookEventsCounter = new Counter({
      name: 'webhook_events_total',
      help: 'Webhook events processed',
      labelNames: ['provider', 'outcome'], // outcome: success | duplicate | invalid_signature | error
      registers: [this.registry],
    });

    // Future-proof: queue metrics (define now; instrument later when queues are added)
    this.queueJobsProcessedCounter = new Counter({
      name: 'queue_jobs_processed_total',
      help: 'Processed queue jobs',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    this.queueJobDurationHistogram = new Histogram({
      name: 'queue_job_duration_seconds',
      help: 'Queue job duration in seconds',
      labelNames: ['queue', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  incWebhook(provider: string, outcome: 'success' | 'duplicate' | 'invalid_signature' | 'error') {
    this.webhookEventsCounter.labels(provider, outcome).inc();
  }
}