import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoUnidade } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ example: 'Loja Centro', description: 'Nome da unidade' })
  @IsString()
  nome!: string;

  @ApiProperty({ enum: TipoUnidade, example: TipoUnidade.FILIAL })
  @IsEnum(TipoUnidade)
  tipo!: TipoUnidade;

  @ApiPropertyOptional({
    example: '11222333000181',
    description: 'CNPJ da unidade (14 dígitos) ou inscrição municipal (apenas dígitos)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d+$/, { message: 'cnpj_inscricao deve conter apenas dígitos' })
  cnpj_inscricao?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Permite operações de venda sem conexão com a internet',
  })
  @IsBoolean()
  @IsOptional()
  permite_venda_offline?: boolean;
}
