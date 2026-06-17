import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListProductsDto {
  @ApiPropertyOptional({ description: 'Filtro por nome (busca parcial)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Filtro por SKU (busca parcial)' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ description: 'Filtro por código de barras (busca exata)' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Filtro por UUID da categoria' })
  @IsUUID()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Filtro por UUID da marca' })
  @IsUUID()
  @IsOptional()
  brand_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo (true/false)' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por destaque (true/false)' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
