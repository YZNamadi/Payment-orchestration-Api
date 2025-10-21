import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity, TransactionStatus } from './transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
  ) {}

  async list(page = 1, limit = 20) {
    const [items, total] = await this.repo.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getByReference(reference: string) {
    return this.repo.findOne({ where: { reference } });
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
    const entity = this.repo.create({
      reference: params.reference,
      provider: params.provider,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      retry_count: 0,
      metadata: params.metadata,
      provider_summary: params.provider_summary,
      provider_response_encrypted: params.provider_response_encrypted,
    });
    return this.repo.save(entity);
  }

  async updateStatusByReference(params: {
    reference: string;
    status: TransactionStatus;
    provider_summary?: Record<string, any>;
    provider_response_encrypted?: any;
  }) {
    const entity = await this.repo.findOne({ where: { reference: params.reference } });
    if (!entity) return null;
    entity.status = params.status;
    if (params.provider_summary !== undefined) {
      entity.provider_summary = params.provider_summary;
    }
    if (params.provider_response_encrypted !== undefined) {
      entity.provider_response_encrypted = params.provider_response_encrypted;
    }
    return this.repo.save(entity);
  }
}