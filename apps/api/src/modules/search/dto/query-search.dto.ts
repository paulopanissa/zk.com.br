import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export enum SearchEntityType {
  PRODUCTS = 'products',
  CUSTOMERS = 'customers',
  SUPPLIERS = 'suppliers',
  CATEGORIES = 'categories',
  BRANDS = 'brands',
}

export const PDV_ALLOWED_TYPES: SearchEntityType[] = [
  SearchEntityType.PRODUCTS,
  SearchEntityType.CUSTOMERS,
];

export class QuerySearchDto {
  @ApiProperty({ example: 'golden', description: 'Termo de busca (mín 2 chars)' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string;

  @ApiPropertyOptional({
    description: 'Tipos a buscar (CSV). Padrão: todos visíveis ao role.',
    example: 'products,customers',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : value,
  )
  @IsEnum(SearchEntityType, { each: true })
  @IsOptional()
  types?: SearchEntityType[];

  @ApiPropertyOptional({ description: 'Resultados por grupo (máx 20)', default: 5 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 5;
}
