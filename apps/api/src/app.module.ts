import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './common/auth/auth.module';
import { StorageModule } from './common/storage/storage.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { HealthModule } from './health/health.module';
import { CompanySettingsModule } from './modules/company-settings/company-settings.module';
import { UnitsModule } from './modules/units/units.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CostCenterModule } from './modules/cost-center/cost-center.module';
import { ProductsModule } from './modules/products/products.module';
import { LotsModule } from './modules/lots/lots.module';
import { PricingEngineModule } from './modules/pricing-engine/pricing-engine.module';
import { StockModule } from './modules/stock/stock.module';
import { TaxConfigModule } from './modules/tax-config/tax-config.module';
import { PaymentConfigModule } from './modules/payment-config/payment-config.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SearchModule } from './modules/search/search.module';
import { LgpdModule } from './modules/lgpd/lgpd.module';
import { CuponsModule } from './modules/cupons/cupons.module';
import { NfEntradaModule } from './modules/nf-entrada/nf-entrada.module';
import { VendasModule } from './modules/vendas/vendas.module';
import { EntregasModule } from './modules/entregas/entregas.module';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { JwtSystemGuard } from './common/auth/guards/jwt-system.guard';
import { RolesGuard } from './common/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    StorageModule,
    CryptoModule,
    HealthModule,
    TenancyModule,
    CompanySettingsModule,
    UnitsModule,
    BrandsModule,
    CategoriesModule,
    SuppliersModule,
    CostCenterModule,
    ProductsModule,
    LotsModule,
    PricingEngineModule,
    StockModule,
    TaxConfigModule,
    PaymentConfigModule,
    CustomersModule,
    SearchModule,
    LgpdModule,
    NfEntradaModule,
    VendasModule,
    CuponsModule,
    EntregasModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtSystemGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
