import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertThresholdUnit, AlertType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateAlertRuleDto {
  @ApiProperty({ enum: AlertType, description: 'Tipo de alerta' })
  @IsEnum(AlertType)
  type!: AlertType;

  @ApiProperty({ description: 'Nome descritivo da regra', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Valor do threshold. Ex: 5 (unidades) ou 1500 (15% em BPS)',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  threshold_value?: number = 0;

  @ApiPropertyOptional({ enum: AlertThresholdUnit, description: 'Unidade do threshold' })
  @IsEnum(AlertThresholdUnit)
  @IsOptional()
  threshold_unit?: AlertThresholdUnit;

  @ApiPropertyOptional({
    description: 'ID do produto alvo. null = regra global (aplica a todos os produtos)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  product_id?: string;
}
