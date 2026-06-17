import { Module } from '@nestjs/common';
import { CostCenterController } from './cost-center.controller';
import { CostCenterRepository } from './cost-center.repository';
import { CostCenterService } from './cost-center.service';

@Module({
  controllers: [CostCenterController],
  providers: [CostCenterRepository, CostCenterService],
  exports: [CostCenterService],
})
export class CostCenterModule {}
