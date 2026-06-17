import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryAlertEventDto {
  @ApiPropertyOptional({ enum: AlertType, description: 'Filtrar por tipo de alerta' })
  @IsEnum(AlertType)
  @IsOptional()
  type?: AlertType;

  @ApiPropertyOptional({ description: 'Filtrar eventos de um produto específico', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional({ description: 'Data de início do intervalo (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  data_inicio?: string;

  @ApiPropertyOptional({ description: 'Data de fim do intervalo (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  data_fim?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', default: 20, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsOptional()
  limit?: number = 20;
}
