import { ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryCouponDto {
  @ApiPropertyOptional({ enum: CouponType })
  @IsEnum(CouponType)
  @IsOptional()
  type?: CouponType;

  @ApiPropertyOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsOptional()
  limit?: number;
}
