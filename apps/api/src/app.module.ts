import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './common/auth/auth.module';
import { StorageModule } from './common/storage/storage.module';
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtSystemGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
