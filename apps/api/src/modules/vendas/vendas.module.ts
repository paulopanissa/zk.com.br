import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { StockModule } from '../stock/stock.module';
import { VendasController } from './vendas.controller';
import { VendasRepository } from './vendas.repository';
import { VendasService } from './vendas.service';

@Module({
  imports: [TenancyModule, StockModule],
  controllers: [VendasController],
  providers: [VendasRepository, VendasService],
  exports: [VendasService],
})
export class VendasModule {}
