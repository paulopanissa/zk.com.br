import { Module } from '@nestjs/common';
import { PricingEngineController } from './pricing-engine.controller';
import { PricingEngineService } from './pricing-engine.service';

/**
 * PricingEngineModule — sem banco, sem repository.
 * Exporta PricingEngineService para uso por ProductsModule, PDV e outros módulos.
 */
@Module({
  controllers: [PricingEngineController],
  providers: [PricingEngineService],
  exports: [PricingEngineService],
})
export class PricingEngineModule {}
