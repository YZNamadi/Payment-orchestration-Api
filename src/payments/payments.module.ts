import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { ProvidersModule } from '../providers/providers.module';
import { TransactionEntity } from '../transactions/transaction.entity';
import { TransactionsMockModule } from '../transactions/transactions.mock.module';

const importsResolved =
  process.env.DB_MOCK === 'true'
    ? [TransactionsMockModule, ProvidersModule]
    : [TypeOrmModule.forFeature([TransactionEntity]), TransactionsModule, ProvidersModule];

@Module({
  imports: importsResolved,
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}