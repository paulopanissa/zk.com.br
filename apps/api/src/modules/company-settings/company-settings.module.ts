import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsRepository } from './company-settings.repository';
import { CompanySettingsService } from './company-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService, CompanySettingsRepository],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
