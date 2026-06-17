import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Ração Premium Adulto 15kg' })
  @IsString()
  @MaxLength(300)
  name!: string;

  @ApiPropertyOptional({ example: 'RACAO-PREM-15KG' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: '7891234567890' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  barcode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  short_description?: string;

  @ApiPropertyOptional({ default: 'UN', example: 'KG' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  unit?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Estoque mínimo alerta' })
  @IsInt()
  @IsOptional()
  @Min(0)
  min_stock?: number;

  @ApiPropertyOptional({ description: 'UUID da categoria' })
  @IsUUID()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({ description: 'UUID da marca' })
  @IsUUID()
  @IsOptional()
  brand_id?: string;
}
