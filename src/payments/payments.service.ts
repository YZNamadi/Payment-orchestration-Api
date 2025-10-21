import { Injectable } from '@nestjs/common';
import { PaystackService } from '../providers/paystack.service';
import { FlutterwaveService } from '../providers/flutterwave.service';
import { InitiatePaymentDto, ProviderPreference } from './dto/initiate-payment.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paystack: PaystackService,
    private readonly flutterwave: FlutterwaveService,
    private readonly transactions: TransactionsService,
  ) {}

  async initiate(dto: InitiatePaymentDto) {
    const provider = dto.provider_preference || ProviderPreference.PAYSTACK;
    let response;
    const useMock = process.env.DB_MOCK === 'true';
    if (useMock) {
      const ref = `txn_mock_${Date.now()}`;
      response = {
        provider: provider,
        reference: ref,
        checkout_url: `https://example.com/mock-checkout?ref=${ref}`,
      };
    } else {
      if (provider === ProviderPreference.PAYSTACK) {
        response = await this.paystack.initiatePayment({
          amount: dto.amount,
          currency: dto.currency,
          customer: dto.customer,
          metadata: dto.metadata,
        });
      } else {
        response = await this.flutterwave.initiatePayment({
          amount: dto.amount,
          currency: dto.currency,
          customer: dto.customer,
          metadata: dto.metadata,
        });
      }
    }

    await this.transactions.createPending({
      reference: response.reference,
      provider,
      amount: dto.amount,
      currency: dto.currency,
      metadata: dto.metadata,
      provider_summary: {
        checkout_url: response.checkout_url,
        provider: response.provider,
      },
      provider_response_encrypted: response,
    });

    return response;
  }
}