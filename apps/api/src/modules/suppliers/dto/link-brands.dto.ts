import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class LinkBrandsDto {
  @ApiProperty({
    description: 'Lista de UUIDs das marcas a vincular ao fornecedor',
    type: [String],
    example: ['uuid-da-marca-1', 'uuid-da-marca-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  brand_ids!: string[];
}
