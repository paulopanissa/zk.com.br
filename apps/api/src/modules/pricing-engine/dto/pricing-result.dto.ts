import { ApiProperty } from '@nestjs/swagger';

export class PricingBreakdownDto {
  @ApiProperty({ description: 'Custo base = custo + frete + operacional fixo (centavos)', example: 5700 })
  custo_base_centavos!: number;

  @ApiProperty({ description: 'Parcela de impostos calculada sobre o custo base (centavos)', example: 684 })
  custo_impostos_centavos!: number;

  @ApiProperty({ description: 'Parcela do custo operacional variável (centavos)', example: 171 })
  custo_operacional_var_centavos!: number;

  @ApiProperty({ description: 'Parcela da taxa de cartão (centavos)', example: 142 })
  custo_cartao_centavos!: number;

  @ApiProperty({ description: 'Frete em centavos (componente já incluído no custo base)', example: 500 })
  frete_centavos!: number;
}

export class PricingResultDto {
  @ApiProperty({ description: 'Custo total (base + todos os componentes) em centavos', example: 6697 })
  custo_total_centavos!: number;

  @ApiProperty({ description: 'Preço sugerido de venda em centavos', example: 9567 })
  preco_sugerido_centavos!: number;

  @ApiProperty({ description: 'Margem em reais (centavos)', example: 2870 })
  margem_reais_centavos!: number;

  @ApiProperty({ description: 'Margem percentual em basis points (ex: 3000 = 30,00%)', example: 3000 })
  margem_percentual_bps!: number;

  @ApiProperty({ description: 'Detalhamento de cada componente do custo', type: PricingBreakdownDto })
  breakdown!: PricingBreakdownDto;
}
