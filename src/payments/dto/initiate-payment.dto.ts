import { IsInt, IsString, IsOptional, IsEnum, IsObject, IsEmail, Min } from 'class-validator';

export enum ProviderPreference {
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
}

export class CustomerDto {
  @IsEmail()
  email!: string;
}

export class InitiatePaymentDto {
  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsEnum(ProviderPreference)
  provider_preference?: ProviderPreference;

  @IsObject()
  customer!: CustomerDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}