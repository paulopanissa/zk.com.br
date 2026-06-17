import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductSeoDto {
  @ApiPropertyOptional({ description: 'Título SEO (máx 70 caracteres)', maxLength: 70 })
  @IsString()
  @IsOptional()
  @MaxLength(70)
  seo_title?: string;

  @ApiPropertyOptional({
    description: 'Meta description (máx 160 caracteres)',
    maxLength: 160,
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  seo_description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Palavras-chave para SEO' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  seo_keywords?: string[];

  @ApiPropertyOptional({
    description: 'JSON-LD Schema.org (Product). Gerado automaticamente via /seo/generate.',
  })
  @IsObject()
  @IsOptional()
  schema_org_json?: Record<string, unknown>;
}
