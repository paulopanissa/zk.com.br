import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * DTO para criar a configuração de entrega de uma unidade.
 * As credenciais são criptografadas com AES-256-GCM antes de serem persistidas —
 * nunca são retornadas em nenhum GET.
 */
export class CreateDeliveryConfigDto {
  @ApiProperty({ description: 'client_id do app Uber Direct' })
  @IsString()
  @IsNotEmpty()
  client_id!: string;

  @ApiProperty({ description: 'client_secret do app Uber Direct' })
  @IsString()
  @IsNotEmpty()
  client_secret!: string;

  @ApiProperty({ description: 'customer_id da conta Uber Direct (UUID)' })
  @IsString()
  @IsNotEmpty()
  customer_id!: string;

  @ApiProperty({ description: 'webhook_secret configurado no dashboard Uber Direct' })
  @IsString()
  @IsNotEmpty()
  webhook_secret!: string;

  @ApiPropertyOptional({
    description:
      'Valor mínimo do carrinho para frete grátis (em centavos). null = regra desabilitada.',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  free_shipping_threshold_centavos?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
