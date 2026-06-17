import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegimeTributario } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class QueryTaxProfileDto {
  @ApiPropertyOptional({ enum: RegimeTributario, description: 'Filtrar por regime tributário' })
  @IsEnum(RegimeTributario)
  @IsOptional()
  regime_tributario?: RegimeTributario;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  ativo?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar apenas perfis padrão' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  padrao?: boolean;

  @ApiPropertyOptional({ description: 'Número da página', default: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', default: 20 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
