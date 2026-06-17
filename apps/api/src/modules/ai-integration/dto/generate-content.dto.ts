import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiContentType, AiProvider } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class GenerateContentDto {
  @ApiProperty()
  @IsUUID()
  product_id!: string;

  @ApiProperty({ enum: AiContentType, isArray: true, example: ['DESCRIPTION', 'SEO'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(AiContentType, { each: true })
  types!: AiContentType[];

  @ApiPropertyOptional({ enum: AiProvider, description: 'Provedor a usar. Se omitido, usa o primeiro ativo da unidade.' })
  @IsEnum(AiProvider)
  @IsOptional()
  provider?: AiProvider;
}
