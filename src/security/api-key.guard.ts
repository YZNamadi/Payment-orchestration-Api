import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly keys = new Set(
    [
      ...(process.env.API_KEY_VALUES || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      ...(process.env.API_KEY_VALUE ? [process.env.API_KEY_VALUE.trim()] : []),
    ],
  );

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const headerName = (process.env.API_KEY_HEADER || 'x-api-key').toLowerCase();
    const apiKeyHeader = req.headers[headerName];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    if (typeof apiKey === 'string' && this.keys.has(apiKey)) {
      return true;
    }
    throw new UnauthorizedException('Invalid or missing API key');
  }
}