import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryEstoqueDto {
  @ApiPropertyOptional({
    description: 'Dias de threshold para alerta de vencimento de lotes',
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  @IsOptional()
  threshold_dias?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por categoria (UUID)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  categoria_id?: string;

  @ApiPropertyOptional({
    description: 'Página da listagem de posição de estoque',
    minimum: 1,
    maximum: 100,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Registros por página',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
