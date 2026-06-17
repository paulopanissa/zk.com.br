import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ListSuppliersDto {
  @ApiPropertyOptional({ description: 'Filtrar por razão social (parcial, case-insensitive)' })
  @IsString()
  @IsOptional()
  razao_social?: string;

  @ApiPropertyOptional({ description: 'Filtrar por documento (CNPJ/CPF, apenas dígitos)' })
  @IsString()
  @IsOptional()
  document?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  active?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por marca vinculada (UUID da marca)' })
  @IsUUID('4')
  @IsOptional()
  brand_id?: string;

  @ApiPropertyOptional({ description: 'Número da página', default: 1, minimum: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', default: 20, minimum: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
