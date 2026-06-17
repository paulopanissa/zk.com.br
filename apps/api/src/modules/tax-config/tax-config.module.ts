import { Module } from '@nestjs/common';
import { TaxConfigController } from './tax-config.controller';
import { TaxConfigRepository } from './tax-config.repository';
import { TaxConfigService } from './tax-config.service';

@Module({
  controllers: [TaxConfigController],
  providers: [TaxConfigRepository, TaxConfigService],
  exports: [TaxConfigService],
})
export class TaxConfigModule {}
