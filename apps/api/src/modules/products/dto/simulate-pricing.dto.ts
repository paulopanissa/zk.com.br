import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SimulatePricingDto {
  @ApiProperty({ description: 'Preço de custo em centavos (inteiro)', example: 5000 })
  @IsInt()
  @Min(0)
  cost_price_cents!: number;

  @ApiProperty({ description: 'Preço de venda em centavos (inteiro)', example: 8990 })
  @IsInt()
  @Min(0)
  sale_price_cents!: number;
}
