import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateProductDeliveryDto {
  @ApiPropertyOptional({ description: 'Peso em gramas' })
  @IsInt()
  @IsOptional()
  @Min(0)
  weight_grams?: number;

  @ApiPropertyOptional({ description: 'Altura em centímetros' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  height_cm?: number;

  @ApiPropertyOptional({ description: 'Largura em centímetros' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  width_cm?: number;

  @ApiPropertyOptional({ description: 'Profundidade em centímetros' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  depth_cm?: number;

  @ApiPropertyOptional({ description: 'Frete grátis' })
  @IsBoolean()
  @IsOptional()
  free_shipping?: boolean;

  @ApiPropertyOptional({ description: 'Enviado pela loja' })
  @IsBoolean()
  @IsOptional()
  ships_from_store?: boolean;
}
