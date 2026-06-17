import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseCalculo, TipoImposto } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class CreateTaxRateDto {
  @ApiProperty({
    enum: TipoImposto,
    example: TipoImposto.ICMS,
  })
  @IsEnum(TipoImposto)
  imposto!: TipoImposto;

  @ApiProperty({
    description:
      'Alíquota em centésimos de porcento. Aceita float (12.5) ou inteiro (1250). ' +
      '12% = 1200, 0.65% = 65, 12.5% = 1250.',
    example: 1200,
  })
  @Transform(({ value }) => {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value);
    return n < 100 ? Math.round(n * 100) : Math.round(n);
  })
  @IsInt()
  @Min(0)
  aliquota_percentual!: number;

  @ApiProperty({ enum: BaseCalculo, example: BaseCalculo.PRECO_VENDA })
  @IsEnum(BaseCalculo)
  base_calculo!: BaseCalculo;

  @ApiPropertyOptional({ default: false, description: 'Imposto já incluso no preço de venda' })
  @IsBoolean()
  @IsOptional()
  incluso_no_preco?: boolean = false;

  @ApiPropertyOptional({
    description: 'UF de origem (2 letras maiúsculas). Obrigatório para ICMS interestadual.',
    example: 'SP',
  })
  @IsString()
  @IsOptional()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'uf_origem deve ter 2 letras maiúsculas' })
  uf_origem?: string;

  @ApiPropertyOptional({
    description: 'UF de destino (2 letras maiúsculas). Obrigatório para ICMS interestadual.',
    example: 'RJ',
  })
  @IsString()
  @IsOptional()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'uf_destino deve ter 2 letras maiúsculas' })
  uf_destino?: string;
}
