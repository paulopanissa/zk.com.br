import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FieldOptionDto } from './create-field-definition.dto';

export class UpdateFieldDefinitionDto {
  @ApiPropertyOptional({ example: 'Raça do Animal', description: 'Novo label do campo' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean;

  @ApiPropertyOptional({ example: '^[a-zA-Z ]+$' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  validacao_regex?: string;

  @ApiPropertyOptional({ type: [FieldOptionDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  opcoes?: FieldOptionDto[];

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @IsOptional()
  @Min(1)
  ordem?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
