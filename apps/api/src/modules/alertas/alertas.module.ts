import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { AlertasController } from './alertas.controller';
import { AlertasRepository } from './alertas.repository';
import { AlertasService } from './alertas.service';

@Module({
  imports: [TenancyModule],
  controllers: [AlertasController],
  providers: [AlertasRepository, AlertasService],
  exports: [AlertasService],
})
export class AlertasModule {}
