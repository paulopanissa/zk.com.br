import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUrl } from 'class-validator';
import { CreateBrandDto } from './create-brand.dto';

export class UpdateBrandDto extends PartialType(CreateBrandDto) {
  @ApiPropertyOptional({ description: 'Ativar ou desativar a marca' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'URL externa do logotipo. Envie null para remover.' })
  @IsUrl()
  @IsOptional()
  override logo_url?: string;
}
