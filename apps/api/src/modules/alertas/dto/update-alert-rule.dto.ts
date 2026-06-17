import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertThresholdUnit } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UpdateAlertRuleDto {
  @ApiPropertyOptional({ description: 'Nome descritivo da regra', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Ativar/desativar a regra' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Novo valor do threshold' })
  @IsInt()
  @Min(0)
  @IsOptional()
  threshold_value?: number;

  @ApiPropertyOptional({ enum: AlertThresholdUnit })
  @IsEnum(AlertThresholdUnit)
  @IsOptional()
  threshold_unit?: AlertThresholdUnit;

  @ApiPropertyOptional({
    description: 'ID do produto alvo. Enviar null para tornar a regra global',
    format: 'uuid',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  product_id?: string | null;
}
