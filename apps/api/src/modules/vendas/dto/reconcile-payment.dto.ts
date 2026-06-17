import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReconcilePaymentDto {
  @ApiPropertyOptional({ description: 'ID da transação no provedor de pagamento' })
  @IsString()
  @IsOptional()
  provider_transaction_id?: string;

  @ApiPropertyOptional({ description: 'Data/hora do pagamento (ISO 8601). Padrão: now()' })
  @IsDateString()
  @IsOptional()
  pago_em?: string;
}
