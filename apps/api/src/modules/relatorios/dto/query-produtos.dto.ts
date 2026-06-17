import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

export class QueryProdutosDto {
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
    description: 'Critério de ordenação: margem (em bps) ou volume (unidades)',
    enum: ['margem', 'volume'],
    default: 'volume',
  })
  @IsEnum(['margem', 'volume'])
  @IsOptional()
  ordem?: 'margem' | 'volume';

  @ApiPropertyOptional({
    description: 'Quantidade de produtos a retornar em melhores e piores',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  @IsOptional()
  top?: number;
}
