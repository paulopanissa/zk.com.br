import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class ReorderItemDto {
  @ApiProperty({ description: 'ID da categoria' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Nova posição de ordenação', minimum: 0 })
  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  updates!: ReorderItemDto[];
}
