import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ProvidersModule } from '../providers/providers.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TransactionsMockModule } from '../transactions/transactions.mock.module';

const importsResolved =
  process.env.DB_MOCK === 'true'
    ? [TransactionsMockModule, ProvidersModule]
    : [TransactionsModule, ProvidersModule];

@Module({
  imports: importsResolved,
  controllers: [WebhooksController],
})
export class WebhooksModule {}