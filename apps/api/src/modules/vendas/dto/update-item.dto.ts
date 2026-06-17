import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateItemDto {
  @ApiPropertyOptional({ description: 'Nova quantidade' })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  @IsOptional()
  quantidade?: number;

  @ApiPropertyOptional({ description: 'Desconto no item em centavos' })
  @IsInt()
  @Min(0)
  @IsOptional()
  desconto_item_centavos?: number;
}
