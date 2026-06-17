import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO para criação de entrega — normalmente publicado na fila pelo módulo de Vendas.
 * O campo venda_id garante idempotência: uma mesma venda só gera uma entrega.
 *
 * LGPD: CPF não é enviado à Uber Direct. Apenas nome, telefone (E.164) e endereço.
 * Base legal: execução de contrato (art. 7º, V, LGPD).
 */
export class CreateDeliveryDto {
  @ApiProperty({ description: 'ID da venda (UUID) — chave de idempotência' })
  @IsUUID()
  venda_id!: string;

  @ApiPropertyOptional({
    description: 'quote_id obtido via /entregas/quote (válido 15 min). Se omitido, a Uber cotará automaticamente.',
  })
  @IsString()
  @IsOptional()
  uber_quote_id?: string;

  @ApiProperty({ description: 'Nome completo do destinatário' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  recipient_name!: string;

  @ApiProperty({
    description: 'Telefone do destinatário em formato E.164',
    example: '+5511999999999',
  })
  @IsString()
  @Matches(/^\+\d{10,15}$/, {
    message: 'recipient_phone deve estar no formato E.164 (ex: +5511999999999)',
  })
  recipient_phone!: string;

  @ApiProperty({ description: 'Endereço de entrega completo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  dropoff_address!: string;

  @ApiProperty({ description: 'Endereço de coleta (loja)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  pickup_address!: string;

  @ApiPropertyOptional({ description: 'Taxa de entrega em centavos (inteiro)', example: 1500 })
  @IsInt()
  @Min(0)
  @IsOptional()
  fee_centavos?: number;
}
