import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ description: 'Código único (case-insensitive, será armazenado em maiúsculas)' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType)
  type!: CouponType;

  @ApiPropertyOptional({ description: 'Desconto em centavos (para FIXO)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  value_centavos?: number;

  @ApiPropertyOptional({ description: 'Desconto em basis points — 100 = 1% (para PERCENTUAL)' })
  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  percent_bps?: number;

  @ApiPropertyOptional({ description: 'Produto alvo. null = qualquer produto do carrinho' })
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Limite de usos. null = ilimitado' })
  @IsInt()
  @Min(1)
  @IsOptional()
  max_uses?: number;

  @ApiPropertyOptional({ description: 'Data de início (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  valid_from?: string;

  @ApiPropertyOptional({ description: 'Data de expiração (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  valid_until?: string;
}
