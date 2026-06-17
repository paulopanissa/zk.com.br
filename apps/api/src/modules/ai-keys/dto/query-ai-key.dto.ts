import { ApiPropertyOptional } from '@nestjs/swagger';
import { AiProvider } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryAiKeyDto {
  @ApiPropertyOptional({ enum: AiProvider })
  @IsEnum(AiProvider)
  @IsOptional()
  provider?: AiProvider;
}
