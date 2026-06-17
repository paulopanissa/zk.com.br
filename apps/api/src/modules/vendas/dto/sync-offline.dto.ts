import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OfflineItemDto {
  @IsUUID()
  product_id!: string;

  @IsNumber()
  @Min(0.001)
  quantidade!: number;

  @IsInt()
  @Min(0)
  preco_unitario_centavos!: number;

  @IsInt()
  @Min(0)
  desconto_item_centavos!: number;
}

export class OfflinePaymentDto {
  @IsEnum(PaymentMethod)
  metodo!: PaymentMethod;

  @IsInt()
  @Min(1)
  valor_centavos!: number;
}

export class OfflineSaleDto {
  @ApiProperty({ description: 'UUID gerado pelo cliente para dedup — obrigatório no sync offline' })
  @IsString()
  @MaxLength(100)
  sync_id!: string;

  @IsUUID()
  @IsOptional()
  cliente_id?: string;

  @IsDateString()
  created_at!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OfflineItemDto)
  items!: OfflineItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OfflinePaymentDto)
  pagamentos!: OfflinePaymentDto[];

  @IsInt()
  @Min(0)
  desconto_total_centavos!: number;

  @IsString()
  @IsOptional()
  observacao?: string;
}

export class SyncOfflineDto {
  @ApiProperty({ type: [OfflineSaleDto], description: 'Vendas offline a sincronizar' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OfflineSaleDto)
  vendas!: OfflineSaleDto[];
}
