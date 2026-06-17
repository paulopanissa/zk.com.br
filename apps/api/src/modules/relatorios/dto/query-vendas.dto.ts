import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryVendasDto {
  @ApiPropertyOptional({
    description: 'Data de início do período (ISO 8601). Default: 30 dias atrás',
    example: '2026-05-01T00:00:00.000Z',
  })
  @IsISO8601()
  @IsOptional()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período (ISO 8601). Default: agora',
    example: '2026-06-01T23:59:59.999Z',
  })
  @IsISO8601()
  @IsOptional()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por categoria (UUID)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  categoria_id?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de top produtos a retornar',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
