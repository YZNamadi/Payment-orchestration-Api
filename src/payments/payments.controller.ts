import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../security/api-key.guard';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@UseGuards(ApiKeyGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('initiate')
  async initiate(@Body() dto: InitiatePaymentDto) {
    return this.service.initiate(dto);
  }
}