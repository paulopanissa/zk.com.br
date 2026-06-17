import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

/**
 * DTO para cotação de frete em tempo real.
 * Retorna fee_centavos, ETA e quote_id (válido por 15 min) ou fee_centavos = 0
 * quando a regra de frete grátis é satisfeita.
 */
export class QuoteDeliveryDto {
  @ApiProperty({ description: 'Total bruto do carrinho em centavos (inteiro)', example: 15000 })
  @IsInt()
  @Min(0)
  cart_total_centavos!: number;

  @ApiProperty({
    description: 'Endereço de entrega completo (logradouro, número, bairro, cidade, UF)',
    example: 'Rua das Flores, 123, Centro, São Paulo, SP',
  })
  @IsString()
  @IsNotEmpty()
  dropoff_address!: string;

  @ApiProperty({
    description: 'Telefone do destinatário em formato E.164',
    example: '+5511999999999',
  })
  @IsString()
  @Matches(/^\+\d{10,15}$/, {
    message: 'recipient_phone deve estar no formato E.164 (ex: +5511999999999)',
  })
  recipient_phone!: string;

  @ApiPropertyOptional({
    description: 'Endereço de coleta (pickup). Se omitido, usa o endereço cadastrado na unidade.',
  })
  @IsString()
  @IsOptional()
  pickup_address?: string;
}
