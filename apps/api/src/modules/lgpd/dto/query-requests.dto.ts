import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { LgpdRequestStatus, LgpdRequestType } from '@prisma/client';

export class QueryLgpdRequestsDto {
  @ApiPropertyOptional({ enum: LgpdRequestStatus })
  @IsEnum(LgpdRequestStatus)
  @IsOptional()
  status?: LgpdRequestStatus;

  @ApiPropertyOptional({ enum: LgpdRequestType })
  @IsEnum(LgpdRequestType)
  @IsOptional()
  tipo?: LgpdRequestType;

  @ApiPropertyOptional({ description: 'Filtrar por cliente' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
