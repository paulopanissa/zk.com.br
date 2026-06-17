import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetDiscountDto {
  @ApiProperty({ description: 'Desconto total em centavos (aplicado sobre o total bruto)' })
  @IsInt()
  @Min(0)
  desconto_total_centavos!: number;
}
