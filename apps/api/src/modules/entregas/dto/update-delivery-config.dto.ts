import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * DTO para atualização parcial da configuração de entrega.
 * Todos os campos são opcionais — apenas os informados serão atualizados.
 */
export class UpdateDeliveryConfigDto {
  @ApiPropertyOptional({ description: 'Novo client_id do app Uber Direct' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  client_id?: string;

  @ApiPropertyOptional({ description: 'Novo client_secret do app Uber Direct' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  client_secret?: string;

  @ApiPropertyOptional({ description: 'Novo customer_id da conta Uber Direct' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Novo webhook_secret' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  webhook_secret?: string;

  @ApiPropertyOptional({
    description:
      'Valor mínimo do carrinho para frete grátis (em centavos). null = desabilitar regra.',
    nullable: true,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  free_shipping_threshold_centavos?: number | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
