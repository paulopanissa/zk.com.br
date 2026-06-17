import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SignedUrlQueryDto {
  @ApiProperty({
    example: 'logos/brands/550e8400-e29b-41d4-a716-446655440000.png',
    description: 'Key do arquivo no storage (gerada pelo servidor no momento do upload)',
  })
  @IsString()
  key!: string;

  @ApiPropertyOptional({
    example: 3600,
    description: 'TTL em segundos para a URL assinada (padrão: 3600, mínimo: 60, máximo: 43200). Para arquivos fiscais o máximo é 600 segundos (10 min).',
    default: 3600,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(43200)
  @Type(() => Number)
  ttl?: number;
}
