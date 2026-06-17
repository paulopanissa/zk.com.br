import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateProductPricingDto {
  @ApiPropertyOptional({ description: 'Preço de custo em centavos (inteiro)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  cost_price_cents?: number;

  @ApiPropertyOptional({ description: 'Preço de venda em centavos (inteiro)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  sale_price_cents?: number;

  @ApiPropertyOptional({ description: 'Preço promocional em centavos (inteiro)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  promotional_price_cents?: number;

  @ApiPropertyOptional({ description: 'Início da promoção (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  promotional_starts_at?: string;

  @ApiPropertyOptional({ description: 'Fim da promoção (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  promotional_ends_at?: string;

  @ApiPropertyOptional({ description: 'Habilita desconto manual no PDV' })
  @IsBoolean()
  @IsOptional()
  discount_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Percentual máximo de desconto permitido (0–100), máx 2 casas decimais' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(100)
  max_discount_pct?: number;
}
