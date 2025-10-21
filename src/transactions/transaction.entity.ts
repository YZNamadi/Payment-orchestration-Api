import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ProviderResponseEncryptionTransformer } from '../security/encryption.transformer';

export type ProviderType = 'PAYSTACK' | 'FLUTTERWAVE';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

@Entity({ name: 'transactions' })
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  reference!: string;

  @Column({ type: 'varchar', length: 20 })
  provider!: ProviderType;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 10 })
  currency!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: TransactionStatus;

  @Column({ type: 'int', default: 0 })
  retry_count!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Encrypted TEXT; transformer handles AES-256-GCM with per-record IV
  @Column({ type: 'text', nullable: true, transformer: ProviderResponseEncryptionTransformer })
  provider_response_encrypted?: any;

  // Non-sensitive summary for quick querying/inspection
  @Column({ type: 'jsonb', nullable: true })
  provider_summary?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}