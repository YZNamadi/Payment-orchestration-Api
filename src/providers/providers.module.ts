import { Module } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { FlutterwaveService } from './flutterwave.service';

@Module({
  providers: [PaystackService, FlutterwaveService],
  exports: [PaystackService, FlutterwaveService],
})
export class ProvidersModule {}