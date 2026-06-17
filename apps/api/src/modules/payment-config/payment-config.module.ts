import { Module } from '@nestjs/common';
import { PaymentConfigController } from './payment-config.controller';
import { PaymentConfigRepository } from './payment-config.repository';
import { PaymentConfigService } from './payment-config.service';

@Module({
  controllers: [PaymentConfigController],
  providers: [PaymentConfigRepository, PaymentConfigService],
  exports: [PaymentConfigService],
})
export class PaymentConfigModule {}
