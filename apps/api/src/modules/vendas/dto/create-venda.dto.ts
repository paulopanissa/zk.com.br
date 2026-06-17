import { ApiPropertyOptional } from '@nestjs/swagger';
import { VendaOrigem } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateVendaDto {
  @ApiPropertyOptional({ enum: VendaOrigem, default: VendaOrigem.PDV })
  @IsEnum(VendaOrigem)
  @IsOptional()
  origem?: VendaOrigem = VendaOrigem.PDV;

  @ApiPropertyOptional({ description: 'ID do cliente (opcional)' })
  @IsUUID()
  @IsOptional()
  cliente_id?: string;

  @ApiPropertyOptional({ description: 'Observação interna' })
  @IsString()
  @IsOptional()
  observacao?: string;

  @ApiPropertyOptional({ description: 'UUID gerado pelo cliente para dedup offline (max 100 chars)' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  sync_id?: string;
}
