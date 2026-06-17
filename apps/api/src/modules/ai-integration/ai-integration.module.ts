import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AiKeysModule } from '../ai-keys/ai-keys.module';
import { AiContentProcessor, AI_CONTENT_QUEUE } from './ai-content.processor';
import { AiIntegrationController } from './ai-integration.controller';
import { AiIntegrationRepository } from './ai-integration.repository';
import { AiIntegrationService } from './ai-integration.service';

@Module({
  imports: [
    AiKeysModule,
    BullModule.registerQueue({ name: AI_CONTENT_QUEUE }),
  ],
  controllers: [AiIntegrationController],
  providers: [AiIntegrationService, AiIntegrationRepository, AiContentProcessor],
  exports: [AiIntegrationService],
})
export class AiIntegrationModule {}
