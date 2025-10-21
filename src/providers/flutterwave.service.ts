import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ProviderService, InitiateResponse } from './provider.interface';

function genRef() {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable()
export class FlutterwaveService implements ProviderService {
  async initiatePayment(params: {
    amount: number;
    currency: string;
    customer: { email: string };
    metadata?: Record<string, any>;
  }): Promise<InitiateResponse> {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) throw new Error('FLUTTERWAVE_SECRET_KEY is not configured');

    const tx_ref = genRef();
    const payload = {
      tx_ref,
      amount: params.amount,
      currency: params.currency,
      customer: { email: params.customer.email },
      meta: params.metadata || {},
    };

    const res = await axios.post<any>('https://api.flutterwave.com/v3/payments', payload, {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });
    const data: any = (res as any).data?.data || {};
    return {
      provider: 'FLUTTERWAVE',
      reference: tx_ref,
      checkout_url: data.link,
    };
  }

  verifyWebhook(headers: Record<string, string>, _rawBody: string): boolean {
    const secretHash = process.env.FLW_SECRET_HASH || '';
    const header = headers['verif-hash'] || headers['Verif-Hash'] || headers['VERIF-HASH'];
    if (!secretHash || !header) return false;
    return header === secretHash;
  }

  normalizeWebhook(payload: any) {
    const data = payload?.data || payload;
    const statusRaw = (data?.status || payload?.event || '').toString().toLowerCase();
    const status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED' =
      statusRaw.includes('cancel')
        ? 'CANCELLED'
        : statusRaw.includes('success') || statusRaw.includes('successful')
        ? 'SUCCESS'
        : statusRaw.includes('fail')
        ? 'FAILED'
        : 'PENDING';
    return {
      provider: 'FLUTTERWAVE' as const,
      reference: String(data?.tx_ref || data?.reference || payload?.data?.tx_ref || ''),
      status,
      amount: Number(data?.amount || 0),
      currency: String(data?.currency || 'NGN'),
    };
  }
}