import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCustomerDto {
  @ApiPropertyOptional({
    example: 'Maria',
    description: 'Busca por nome usando pg_trgm similarity (similarity > 0.3 ou ILIKE)',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ example: '11999998888', description: 'Busca por prefixo de telefone' })
  @IsString()
  @IsOptional()
  telefone?: string;

  @ApiPropertyOptional({ example: '123.456.789-09', description: 'Busca exata por CPF/CNPJ (via hash)' })
  @IsString()
  @IsOptional()
  cpf_cnpj?: string;

  @ApiPropertyOptional({ example: 'maria@email.com', description: 'Busca por e-mail (case-insensitive)' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo', default: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  ativo?: boolean;

  @ApiPropertyOptional({ description: 'Número da página', default: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página (máx 100)', default: 20 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
