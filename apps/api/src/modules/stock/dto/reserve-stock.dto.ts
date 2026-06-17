import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class ReserveStockDto {
  @ApiProperty({ description: 'UUID do produto a ser reservado', format: 'uuid' })
  @IsUUID()
  product_id!: string;

  @ApiProperty({
    description:
      'Quantidade a reservar (sempre positiva; até 3 casas decimais). ' +
      'O algoritmo FIFO distribui a reserva entre os lotes disponíveis.',
    minimum: 0.001,
    example: 3.0,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @ApiProperty({
    description:
      'Chave de idempotência obrigatória. Garante que uma segunda chamada com a mesma chave ' +
      'retorne o resultado da primeira sem criar movimentações duplicadas.',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  idempotency_key!: string;

  @ApiPropertyOptional({
    description: 'UUID do documento de referência (ex: ID da venda)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  reference_id?: string;
}
