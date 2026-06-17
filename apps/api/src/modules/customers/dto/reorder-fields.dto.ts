import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class FieldOrderItemDto {
  @ApiProperty({ example: 'uuid-do-campo', description: 'ID da definição de campo' })
  @IsString()
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 1, description: 'Nova posição de exibição' })
  @IsInt()
  @Min(1)
  ordem!: number;
}

export class ReorderFieldsDto {
  @ApiProperty({ type: [FieldOrderItemDto], description: 'Lista de campos com suas novas ordens' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FieldOrderItemDto)
  fields!: FieldOrderItemDto[];
}
