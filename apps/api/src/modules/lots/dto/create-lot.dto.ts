import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLotDto {
  @ApiProperty({ description: 'UUID do produto ao qual este lote pertence', example: 'uuid-v4' })
  @IsUUID()
  product_id!: string;

  @ApiPropertyOptional({ description: 'UUID do item de nota fiscal de entrada', example: 'uuid-v4' })
  @IsUUID()
  @IsOptional()
  invoice_item_id?: string;

  @ApiProperty({ description: 'Código do lote (ex: L2024-001)', example: 'L2024-001' })
  @IsString()
  @MaxLength(100)
  code!: string;

  @ApiPropertyOptional({
    description: 'Data de validade no formato YYYY-MM-DD',
    example: '2025-12-31',
  })
  @IsDateString()
  @IsOptional()
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Data de fabricação no formato YYYY-MM-DD',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsOptional()
  manufactured_at?: string;

  @ApiProperty({
    description: 'Quantidade recebida (até 3 casas decimais)',
    example: 100.5,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity_received!: number;

  @ApiPropertyOptional({ description: 'Tags para classificação do lote', example: ['importado'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Observações internas sobre o lote' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Status ativo do lote', default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
