import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { LgpdController } from './lgpd.controller';
import { LgpdRepository } from './lgpd.repository';
import { LgpdService } from './lgpd.service';

// TenancyService is provided globally (@Global) — no explicit import needed.
// CustomersModule is imported to inject CustomersService (exportCustomer, deleteCustomer).
@Module({
  imports: [CustomersModule],
  controllers: [LgpdController],
  providers: [LgpdRepository, LgpdService],
})
export class LgpdModule {}
