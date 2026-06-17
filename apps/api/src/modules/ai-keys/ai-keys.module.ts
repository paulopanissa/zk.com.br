import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { AiKeysController } from './ai-keys.controller';
import { AiKeysRepository } from './ai-keys.repository';
import { AiKeysService } from './ai-keys.service';

@Module({
  imports: [TenancyModule],
  controllers: [AiKeysController],
  providers: [AiKeysService, AiKeysRepository],
  exports: [AiKeysService],
})
export class AiKeysModule {}
