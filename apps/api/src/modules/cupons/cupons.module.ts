import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { CuponsController } from './cupons.controller';
import { CuponsRepository } from './cupons.repository';
import { CuponsService } from './cupons.service';

@Module({
  imports: [TenancyModule],
  controllers: [CuponsController],
  providers: [CuponsRepository, CuponsService],
  exports: [CuponsService, CuponsRepository],
})
export class CuponsModule {}
