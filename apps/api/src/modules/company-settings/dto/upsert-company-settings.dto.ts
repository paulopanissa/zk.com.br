import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegimeTributario } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class UpsertCompanySettingsDto {
  @ApiProperty({ example: 'Pet Shop Exemplo Ltda' })
  @IsString()
  razao_social!: string;

  @ApiPropertyOptional({ example: 'Pet Shop Exemplo' })
  @IsString()
  @IsOptional()
  nome_fantasia?: string;

  @ApiProperty({
    example: '11222333000181',
    description: 'CNPJ (14 dígitos) ou CPF (11 dígitos), apenas números',
  })
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'cnpj_cpf deve ter 11 (CPF) ou 14 (CNPJ) dígitos',
  })
  cnpj_cpf!: string;

  @ApiProperty({ enum: RegimeTributario, example: RegimeTributario.SIMPLES })
  @IsEnum(RegimeTributario)
  regime_tributario!: RegimeTributario;

  @ApiPropertyOptional({ example: '123456789' })
  @IsString()
  @IsOptional()
  inscricao_estadual?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsString()
  @IsOptional()
  inscricao_municipal?: string;

  @ApiPropertyOptional({ example: 'https://www.meusite.com.br' })
  @IsString()
  @IsOptional()
  site_url?: string;

  @ApiPropertyOptional({ example: 'dpo@meusite.com.br' })
  @IsEmail()
  @IsOptional()
  dpo_email?: string;
}
