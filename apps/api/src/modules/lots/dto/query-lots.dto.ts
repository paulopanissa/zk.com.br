import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryLotsDto {
  @ApiPropertyOptional({ default: 1, description: 'Número da página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Itens por página (máx 100)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filtrar por UUID do produto' })
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional({
    description: 'Lotes com validade anterior a esta data (YYYY-MM-DD)',
    example: '2025-06-30',
  })
  @IsDateString()
  @IsOptional()
  expires_before?: string;

  @ApiPropertyOptional({
    description: 'Lotes com validade posterior a esta data (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  expires_after?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo (true/false)' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por tags (array)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Busca parcial por código do lote (case-insensitive)' })
  @IsString()
  @IsOptional()
  code?: string;
}
