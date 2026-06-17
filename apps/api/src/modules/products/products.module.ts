import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [TenancyModule, AiIntegrationModule],
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
