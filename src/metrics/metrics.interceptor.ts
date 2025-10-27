import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const route: string = (req?.route?.path || req?.originalUrl || 'unknown');
    const method: string = (req?.method || 'UNKNOWN');
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const status = String(res?.statusCode ?? 200);
          const end = process.hrtime.bigint();
          const durationSec = Number(end - start) / 1e9;
          this.metrics.apiRequestCounter.labels(route, method, status).inc();
          this.metrics.apiLatencyHistogram.labels(route, method, status).observe(durationSec);
        },
        error: () => {
          const res = context.switchToHttp().getResponse();
          const status = String(res?.statusCode ?? 500);
          const end = process.hrtime.bigint();
          const durationSec = Number(end - start) / 1e9;
          this.metrics.apiRequestCounter.labels(route, method, status).inc();
          this.metrics.apiLatencyHistogram.labels(route, method, status).observe(durationSec);
        }
      })
    );
  }
}