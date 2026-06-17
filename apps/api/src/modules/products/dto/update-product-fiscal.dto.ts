import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateProductFiscalDto {
  @ApiPropertyOptional({
    description: 'Nomenclatura Comum do Mercosul — 8 dígitos numéricos',
    example: '23091000',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'NCM deve ter exatamente 8 dígitos numéricos' })
  ncm?: string;

  @ApiPropertyOptional({
    description: 'Código Fiscal de Operações e Prestações — 4 ou 5 dígitos',
    example: '5102',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4,5}$/, { message: 'CFOP deve ter 4 ou 5 dígitos numéricos' })
  cfop?: string;

  @ApiPropertyOptional({
    description: 'Código Especificador da Substituição Tributária — 7 dígitos',
    example: '2800100',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{7}$/, { message: 'CEST deve ter exatamente 7 dígitos numéricos' })
  cest?: string;

  @ApiPropertyOptional({
    description: 'Origem da mercadoria (0=Nacional, 1=Estrangeira importação direta, ..., 8)',
    minimum: 0,
    maximum: 8,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(8)
  origem?: number;

  @ApiPropertyOptional({
    description: 'CST ICMS — regime normal (3 dígitos). Mutuamente exclusivo com csosn.',
    example: '000',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'CST ICMS deve ter exatamente 3 dígitos' })
  cst_icms?: string;

  @ApiPropertyOptional({
    description: 'CSOSN — Simples Nacional (3 dígitos). Mutuamente exclusivo com cst_icms.',
    example: '400',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'CSOSN deve ter exatamente 3 dígitos' })
  csosn?: string;

  @ApiPropertyOptional({ description: 'CST PIS — 2 dígitos', example: '07' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'CST PIS deve ter exatamente 2 dígitos' })
  cst_pis?: string;

  @ApiPropertyOptional({ description: 'CST COFINS — 2 dígitos', example: '07' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'CST COFINS deve ter exatamente 2 dígitos' })
  cst_cofins?: string;

  @ApiPropertyOptional({ description: 'CST IPI — 2 dígitos', example: '50' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'CST IPI deve ter exatamente 2 dígitos' })
  cst_ipi?: string;

  @ApiPropertyOptional({ description: 'Alíquota ICMS em % (0–100), máx 2 casas decimais', example: 12 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(100)
  aliquota_icms?: number;

  @ApiPropertyOptional({ description: 'Alíquota PIS em % (0–100), máx 2 casas decimais', example: 0.65 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(100)
  aliquota_pis?: number;

  @ApiPropertyOptional({ description: 'Alíquota COFINS em % (0–100), máx 2 casas decimais', example: 3 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(100)
  aliquota_cofins?: number;

  @ApiPropertyOptional({ description: 'Alíquota IPI em % (0–100), máx 2 casas decimais', example: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(100)
  aliquota_ipi?: number;
}
