import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { StockEventsService } from './stock-events.service';
import { StockController } from './stock.controller';
import { StockRepository } from './stock.repository';
import { StockService } from './stock.service';

@Module({
  imports: [TenancyModule],
  controllers: [StockController],
  providers: [StockRepository, StockService, StockEventsService],
  exports: [StockService],
})
export class StockModule {}
