import { Injectable } from '@nestjs/common';
import axios from 'axios';
import crypto from 'crypto';
import { ProviderService, InitiateResponse } from './provider.interface';

@Injectable()
export class PaystackService implements ProviderService {
  async initiatePayment(params: {
    amount: number;
    currency: string;
    customer: { email: string };
    metadata?: Record<string, any>;
  }): Promise<InitiateResponse> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const amountKobo = Math.round(params.amount * 100);
    const payload = {
      amount: amountKobo,
      email: params.customer.email,
      currency: params.currency,
      metadata: params.metadata || {},
    };

    const res = await axios.post<any>('https://api.paystack.co/transaction/initialize', payload, {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });
    const data: any = (res as any).data?.data || {};
    return {
      provider: 'PAYSTACK',
      reference: String(data.reference || ''),
      checkout_url: data.authorization_url,
    };
  }

  verifyWebhook(headers: Record<string, string>, rawBody: string): boolean {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const signatureHeader = headers['x-paystack-signature'] || headers['X-Paystack-Signature'];
    if (!signatureHeader || !secret) return false;
    const computed = crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex');
    return computed === signatureHeader;
  }

  normalizeWebhook(payload: any) {
    const data = payload?.data || payload;
    const statusRaw = (data?.status || payload?.event || '').toString().toLowerCase();
    const status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED' =
      statusRaw.includes('cancel')
        ? 'CANCELLED'
        : statusRaw.includes('success')
        ? 'SUCCESS'
        : statusRaw.includes('fail')
        ? 'FAILED'
        : 'PENDING';
    const amount = typeof data?.amount === 'number' ? Math.round(data.amount / 100) : Number((data?.amount || 0)) / 100;
    return {
      provider: 'PAYSTACK' as const,
      reference: String(data?.reference || data?.ref || payload?.data?.reference || ''),
      status,
      amount,
      currency: String(data?.currency || 'NGN'),
    };
  }
}