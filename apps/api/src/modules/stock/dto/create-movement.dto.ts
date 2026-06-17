import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Tipos de movimentação aceitos pelo endpoint público de ajuste manual.
 * Outros tipos (SALE_OUT, PURCHASE_ENTRY, etc.) são criados pelos módulos proprietários.
 */
const MANUAL_TYPES = [
  StockMovementType.MANUAL_ENTRY,
  StockMovementType.MANUAL_EXIT,
] as const;

export class CreateMovementDto {
  @ApiProperty({ description: 'UUID do produto', format: 'uuid' })
  @IsUUID()
  product_id!: string;

  @ApiProperty({ description: 'UUID do lote', format: 'uuid' })
  @IsUUID()
  lot_id!: string;

  @ApiProperty({
    enum: MANUAL_TYPES,
    description:
      'Tipo de movimentação. Apenas MANUAL_ENTRY e MANUAL_EXIT são aceitos neste endpoint. ' +
      'Outros tipos (SALE_OUT, PURCHASE_ENTRY, etc.) são gerados pelos módulos proprietários.',
  })
  @IsEnum(MANUAL_TYPES)
  type!: (typeof MANUAL_TYPES)[number];

  @ApiProperty({
    description:
      'Quantidade (sempre positiva; a direção é controlada pelo type). Até 3 casas decimais.',
    minimum: 0.001,
    example: 10.5,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @ApiPropertyOptional({ description: 'UUID do documento de referência (NF, venda, etc.)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  reference_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo do documento de referência (ex: SALE, INVOICE)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reference_type?: string;

  @ApiPropertyOptional({
    description: 'Chave de idempotência para evitar duplicações',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotency_key?: string;

  @ApiPropertyOptional({
    description:
      'Observações. Obrigatório para MANUAL_EXIT (validado no service). Opcional para MANUAL_ENTRY.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
