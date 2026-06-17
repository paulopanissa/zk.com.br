import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LgpdRequestStatus } from '@prisma/client';

const ALLOWED_STATUSES = [LgpdRequestStatus.CONCLUIDA, LgpdRequestStatus.REJEITADA] as const;
export type ProcessableStatus = (typeof ALLOWED_STATUSES)[number];

export class ProcessLgpdRequestDto {
  @ApiProperty({
    enum: ALLOWED_STATUSES,
    description: 'Novo status da solicitação (CONCLUIDA ou REJEITADA)',
  })
  @IsEnum(LgpdRequestStatus)
  @IsIn(ALLOWED_STATUSES)
  status!: ProcessableStatus;

  @ApiPropertyOptional({ description: 'Justificativa (obrigatória se REJEITADA)' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  justificativa?: string;
}
