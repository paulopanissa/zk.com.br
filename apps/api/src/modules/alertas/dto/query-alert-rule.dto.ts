import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class QueryAlertRuleDto {
  @ApiPropertyOptional({ enum: AlertType, description: 'Filtrar por tipo de alerta' })
  @IsEnum(AlertType)
  @IsOptional()
  type?: AlertType;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo/inativo' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
