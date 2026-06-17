import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

// product_id, invoice_item_id e quantity_received são IMUTÁVEIS após criação — não expostos aqui.
export class UpdateLotDto {
  @ApiPropertyOptional({ description: 'Código do lote (ex: L2024-001)', example: 'L2024-001' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  code?: string;

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

  @ApiPropertyOptional({ description: 'Tags para classificação do lote', example: ['importado'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Observações internas sobre o lote' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Status ativo do lote' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
