import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class MediaOrderItem {
  @ApiProperty({ description: 'UUID da mídia' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Nova posição (0-based)' })
  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderMediaDto {
  @ApiProperty({ type: [MediaOrderItem], description: 'Lista de mídias com nova ordem' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaOrderItem)
  items!: MediaOrderItem[];
}
