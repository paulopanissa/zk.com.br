import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { LgpdRequestType } from '@prisma/client';

export class CreateLgpdRequestDto {
  @ApiProperty({ description: 'ID do cliente titular da solicitação' })
  @IsUUID()
  customer_id!: string;

  @ApiProperty({ enum: LgpdRequestType, description: 'Tipo da solicitação LGPD' })
  @IsEnum(LgpdRequestType)
  tipo!: LgpdRequestType;

  @ApiPropertyOptional({ description: 'Descrição/motivo da solicitação (opcional)' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  descricao?: string;
}
