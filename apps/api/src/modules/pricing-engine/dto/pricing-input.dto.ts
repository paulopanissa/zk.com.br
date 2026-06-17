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
    description: 'Impostos em basis points (ex: 1200 = 12,00%)',
    default: 0,
    example: 1200,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  impostos_bps?: number = 0;

  @ApiPropertyOptional({
    description: 'Frete em centavos',
    default: 0,
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  frete_centavos?: number = 0;

  @ApiPropertyOptional({
    description: 'Custo operacional fixo em centavos',
    default: 0,
    example: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  custo_operacional_centavos?: number = 0;

  @ApiPropertyOptional({
    description: 'Custo operacional variável em basis points (ex: 300 = 3,00%)',
    default: 0,
    example: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  custo_operacional_variavel_bps?: number = 0;

  @ApiPropertyOptional({
    description: 'Taxa de cartão em basis points (ex: 250 = 2,50%)',
    default: 0,
    example: 250,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  taxa_cartao_bps?: number = 0;

  @ApiPropertyOptional({
    description: 'Margem desejada em basis points (0–9999; ex: 3000 = 30,00%)',
    default: 0,
    example: 3000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  margem_desejada_bps?: number = 0;
}
