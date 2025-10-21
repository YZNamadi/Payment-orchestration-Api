import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ormConfig } from './config/ormconfig';
import { TransactionsModule } from './transactions/transactions.module';
import { TransactionsMockModule } from './transactions/transactions.mock.module';
import { PaymentsModule } from './payments/payments.module';
import { ProvidersModule } from './providers/providers.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(3000),
        DB_MOCK: Joi.boolean().default(false),
        DB_HOST: Joi.string().optional(),
        DB_PORT: Joi.number().optional(),
        DB_USERNAME: Joi.string().optional(),
        DB_PASSWORD: Joi.string().optional(),
        DB_NAME: Joi.string().optional(),
        REDIS_HOST: Joi.string().optional(),
        REDIS_PORT: Joi.number().optional(),
        RABBITMQ_URL: Joi.string().optional(),
        PAYSTACK_SECRET_KEY: Joi.string().optional(),
        FLUTTERWAVE_SECRET_KEY: Joi.string().optional(),
        FLW_SECRET_HASH: Joi.string().optional(),
        FIELD_ENCRYPTION_KEY: Joi.string().optional(),
        API_KEY_VALUES: Joi.string().optional(),
        API_KEY_VALUE: Joi.string().optional(),
        API_KEY_HEADER: Joi.string().optional(),
        ALLOWED_ORIGINS: Joi.string().optional(),
        PROMETHEUS_PORT: Joi.number().optional(),
        WEBHOOK_TIMEOUT_MS: Joi.number().default(300000),
        RATE_LIMIT_WINDOW_MS: Joi.number().optional(),
        RATE_LIMIT_MAX: Joi.number().optional(),
      }).unknown(true),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Math.max(1, Math.floor(Number(process.env.RATE_LIMIT_WINDOW_MS || 60000) / 1000)),
        limit: Math.max(1, Number(process.env.RATE_LIMIT_MAX || 100)),
      },
    ]),
    ...(process.env.DB_MOCK === 'true'
      ? []
      : [
          TypeOrmModule.forRootAsync({
            useFactory: () => ({
              ...ormConfig(),
              autoLoadEntities: true,
            }),
          }),
        ]),
    ...(process.env.DB_MOCK === 'true' ? [TransactionsMockModule] : [TransactionsModule]),
    ProvidersModule,
    PaymentsModule,
    WebhooksModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}