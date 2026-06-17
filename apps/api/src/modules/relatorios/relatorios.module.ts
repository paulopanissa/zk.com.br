import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosRepository } from './relatorios.repository';
import { RelatoriosService } from './relatorios.service';

@Module({
  imports: [TenancyModule],
  controllers: [RelatoriosController],
  providers: [RelatoriosService, RelatoriosRepository],
})
export class RelatoriosModule {}
