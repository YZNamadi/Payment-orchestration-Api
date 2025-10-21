export interface InitiateResponse {
  provider: 'PAYSTACK' | 'FLUTTERWAVE';
  reference: string;
  checkout_url?: string;
}

export interface ProviderService {
  initiatePayment(params: {
    amount: number;
    currency: string;
    customer: { email: string };
    metadata?: Record<string, any>;
  }): Promise<InitiateResponse>;

  verifyWebhook(headers: Record<string, string>, rawBody: string): boolean;

  normalizeWebhook(payload: any): {
    provider: 'PAYSTACK' | 'FLUTTERWAVE';
    reference: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
    amount: number;
    currency: string;
  };
}