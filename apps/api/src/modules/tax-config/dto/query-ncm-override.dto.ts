import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoImpostoNcm } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class QueryNcmOverrideDto {
  @ApiPropertyOptional({
    description: 'Filtrar por código NCM (8 dígitos)',
    example: '12345678',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'ncm deve conter exatamente 8 dígitos numéricos' })
  ncm?: string;

  @ApiPropertyOptional({ enum: TipoImpostoNcm, description: 'Filtrar por tipo de imposto' })
  @IsEnum(TipoImpostoNcm)
  @IsOptional()
  imposto?: TipoImpostoNcm;

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
