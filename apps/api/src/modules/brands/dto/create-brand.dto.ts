import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Royal Canin' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ description: 'URL externa do logotipo', example: 'https://example.com/logo.png' })
  @IsUrl()
  @IsOptional()
  logo_url?: string;
}
