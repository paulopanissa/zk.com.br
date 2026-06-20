import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PricingInputDto {
  @ApiProperty({
    description: 'Preço de custo do produto em centavos (inteiro)',
    example: 5000,
  })
  @IsInt()
  @Min(1)
  preco_custo_centavos!: number;

  @ApiPropertyOptional({
    description:
      'Impostos em basis points (ex: 1200 = 12,00%). Incide sobre o preço de venda.',
    default: 0,
    example: 1200,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  impostos_bps?: number = 0;

  @ApiPropertyOptional({
    description: 'Frete de compra (entrada) em centavos — compõe o custo base',
    default: 0,
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  frete_centavos?: number = 0;

  @ApiPropertyOptional({
    description: 'Custo operacional fixo rateado em centavos (ex: rateio de aluguel, energia)',
    default: 0,
    example: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  custo_operacional_centavos?: number = 0;

  @ApiPropertyOptional({
    description:
      'Custo operacional variável em basis points (ex: 300 = 3,00%). Incide sobre o preço de venda.',
    default: 0,
    example: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  custo_operacional_variavel_bps?: number = 0;

  @ApiPropertyOptional({
    description:
      'Taxa de cartão/gateway em basis points (ex: 250 = 2,50%). Incide sobre o preço de venda.',
    default: 0,
    example: 250,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  taxa_cartao_bps?: number = 0;

  @ApiPropertyOptional({
    description:
      'Comissão do vendedor em basis points (ex: 500 = 5,00%). Incide sobre o preço de venda.',
    default: 0,
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  comissao_bps?: number = 0;

  @ApiPropertyOptional({
    description:
      'Margem de lucro desejada em basis points (0–9999; ex: 3000 = 30,00%). ' +
      'A soma de todas as despesas variáveis + margem deve ser < 100%.',
    default: 0,
    example: 3000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  margem_desejada_bps?: number = 0;
}
