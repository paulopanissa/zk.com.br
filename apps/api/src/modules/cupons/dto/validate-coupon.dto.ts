import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Código do cupom' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ description: 'IDs dos produtos no carrinho (para validar cupom por produto)' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  product_ids?: string[];

  @ApiPropertyOptional({ description: 'Total do carrinho em centavos (necessário para calcular desconto percentual corretamente)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  cart_total_centavos?: number;
}
