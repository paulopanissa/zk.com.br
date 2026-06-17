import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class AddItemDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsUUID()
  product_id!: string;

  @ApiProperty({ description: 'Quantidade (pode ser fracionada, ex: 0.5 para peso)' })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantidade!: number;

  @ApiPropertyOptional({ description: 'Desconto no item em centavos', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  desconto_item_centavos?: number = 0;
}
