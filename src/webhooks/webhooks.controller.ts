import { BadRequestException, Controller, Headers, Post, Req, Body } from '@nestjs/common';
import { Request } from 'express';
import { PaystackService } from '../providers/paystack.service';
import { FlutterwaveService } from '../providers/flutterwave.service';
import { TransactionsService } from '../transactions/transactions.service';

function headersToStringMap(headers: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string') out[k] = v;
    else if (Array.isArray(v)) out[k] = v[0];
    else if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly paystack: PaystackService,
    private readonly flutterwave: FlutterwaveService,
    private readonly transactions: TransactionsService,
  ) {}

  @Post('payment')
  async handlePaymentWebhook(@Req() req: Request, @Body() body: any, @Headers() headers: Record<string, any>) {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    const hdrs = headersToStringMap(headers);

    const isPaystack = this.paystack.verifyWebhook(hdrs, rawBody);
    const isFlutterwave = this.flutterwave.verifyWebhook(hdrs, rawBody);
    if (!isPaystack && !isFlutterwave) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const normalized = isPaystack
      ? this.paystack.normalizeWebhook(body)
      : this.flutterwave.normalizeWebhook(body);

    await this.transactions.updateStatusByReference({
      reference: normalized.reference,
      status: normalized.status,
      provider_summary: {
        provider: normalized.provider,
        amount: normalized.amount,
        currency: normalized.currency,
        status: normalized.status,
      },
      provider_response_encrypted: body,
    });

    return { ok: true };
  }
}