import { Injectable } from '@nestjs/common';
import { TransactionEntity, TransactionStatus } from './transaction.entity';

@Injectable()
export class TransactionsMockService {
  private store: TransactionEntity[] = [];

  async list(page = 1, limit = 20) {
    const start = (page - 1) * limit;
    const items = this.store.slice().reverse().slice(start, start + limit);
    return { items, total: this.store.length, page, limit };
  }

  async getByReference(reference: string) {
    return this.store.find(t => t.reference === reference) || null;
  }

  async createPending(params: {
    reference: string;
    provider: 'PAYSTACK' | 'FLUTTERWAVE';
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
    provider_summary?: Record<string, any>;
    provider_response_encrypted?: any;
  }) {
    const entity: TransactionEntity = {
      id: this.store.length + 1,
      reference: params.reference,
      provider: params.provider,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      retry_count: 0,
      metadata: params.metadata,
      provider_summary: params.provider_summary,
      provider_response_encrypted: params.provider_response_encrypted,
      created_at: new Date(),
      updated_at: new Date(),
    } as TransactionEntity;
    this.store.push(entity);
    return entity;
  }

  async updateStatusByReference(params: {
    reference: string;
    status: TransactionStatus;
    provider_summary?: Record<string, any>;
    provider_response_encrypted?: any;
  }) {
    const entity = this.store.find(t => t.reference === params.reference);
    if (!entity) return null;
    // Idempotency: skip updates if already finalized
    if (entity.status !== 'PENDING') {
      return entity;
    }
    entity.status = params.status;
    if (params.provider_summary !== undefined) {
      entity.provider_summary = params.provider_summary;
    }
    if (params.provider_response_encrypted !== undefined) {
      entity.provider_response_encrypted = params.provider_response_encrypted;
    }
    entity.updated_at = new Date();
    return entity;
  }
}