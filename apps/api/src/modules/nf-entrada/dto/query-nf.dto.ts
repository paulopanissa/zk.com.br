import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { NfEntradaStatus } from '@prisma/client';

export class QueryNfDto {
  @IsEnum(NfEntradaStatus)
  @IsOptional()
  status?: NfEntradaStatus;

  @IsUUID()
  @IsOptional()
  fornecedor_id?: string;

  @IsISO8601()
  @IsOptional()
  data_inicio?: string;

  @IsISO8601()
  @IsOptional()
  data_fim?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit: number = 20;
}
