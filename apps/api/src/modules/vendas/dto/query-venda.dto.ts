import { ApiPropertyOptional } from '@nestjs/swagger';
import { VendaOrigem, VendaStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryVendaDto {
  @ApiPropertyOptional({ enum: VendaStatus, description: 'Filtrar por status' })
  @IsEnum(VendaStatus)
  @IsOptional()
  status?: VendaStatus;

  @ApiPropertyOptional({ enum: VendaOrigem, description: 'Filtrar por origem' })
  @IsEnum(VendaOrigem)
  @IsOptional()
  origem?: VendaOrigem;

  @ApiPropertyOptional({ description: 'Filtrar por ID do cliente' })
  @IsUUID()
  @IsOptional()
  cliente_id?: string;

  @ApiPropertyOptional({ description: 'Data início (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  data_inicio?: string;

  @ApiPropertyOptional({ description: 'Data fim (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  data_fim?: string;

  @ApiPropertyOptional({ default: 1, description: 'Página (começa em 1)' })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Itens por página (máx 100)' })
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsOptional()
  limit?: number = 20;
}
