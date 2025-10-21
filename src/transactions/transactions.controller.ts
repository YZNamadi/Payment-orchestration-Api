import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../security/api-key.guard';
import { TransactionsService } from './transactions.service';

@UseGuards(ApiKeyGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10));
    const l = Math.max(1, Math.min(100, parseInt(limit || '20', 10)));
    return this.service.list(p, l);
  }

  @Get(':reference')
  async getByReference(@Param('reference') reference: string) {
    return this.service.getByReference(reference);
  }
}