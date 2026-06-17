import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CustomerFieldType } from '@prisma/client';

export class FieldOptionDto {
  @ApiProperty({ example: 'golden', description: 'Valor interno da opção' })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiProperty({ example: 'Golden Retriever', description: 'Label exibido ao usuário' })
  @IsString()
  @IsNotEmpty()
  label!: string;
}

export class CreateFieldDefinitionDto {
  @ApiProperty({
    example: 'raca_pet',
    description: 'Nome do campo (somente letras minúsculas, números e underscore)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'nome_campo deve conter apenas letras minúsculas, números e underscore',
  })
  nome_campo!: string;

  @ApiProperty({ example: 'Raça do Pet', description: 'Label exibido ao usuário' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @ApiProperty({ enum: CustomerFieldType, example: CustomerFieldType.TEXT })
  @IsEnum(CustomerFieldType)
  tipo!: CustomerFieldType;

  @ApiPropertyOptional({ example: false, description: 'Campo obrigatório' })
  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean = false;

  @ApiPropertyOptional({
    example: '^[a-zA-Z ]+$',
    description: 'Regex de validação para campos TEXT',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ValidateIf((o: CreateFieldDefinitionDto) => o.tipo === CustomerFieldType.TEXT)
  validacao_regex?: string;

  @ApiPropertyOptional({
    type: [FieldOptionDto],
    description: 'Opções para campos SELECT e MULTISELECT',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  opcoes?: FieldOptionDto[];

  @ApiProperty({ example: 1, description: 'Posição de exibição do campo (único por unidade)' })
  @IsInt()
  @Min(1)
  ordem!: number;
}
