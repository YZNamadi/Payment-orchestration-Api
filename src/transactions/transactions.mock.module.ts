import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsMockService } from './transactions.mock.service';

@Module({
  controllers: [TransactionsController],
  providers: [
    { provide: TransactionsService, useClass: TransactionsMockService },
  ],
  exports: [TransactionsService],
})
export class TransactionsMockModule {}