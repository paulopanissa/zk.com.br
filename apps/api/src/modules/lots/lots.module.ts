import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { LotsController } from './lots.controller';
import { LotsRepository } from './lots.repository';
import { LotsService } from './lots.service';

@Module({
  imports: [TenancyModule],
  controllers: [LotsController],
  providers: [LotsRepository, LotsService],
  exports: [LotsService],
})
export class LotsModule {}
