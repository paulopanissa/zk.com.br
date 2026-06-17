import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegimeTributario } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaxProfileDto {
  @ApiProperty({ example: 'Perfil Simples Nacional', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nome!: string;

  @ApiProperty({ enum: RegimeTributario, example: RegimeTributario.SIMPLES })
  @IsEnum(RegimeTributario)
  regime_tributario!: RegimeTributario;

  @ApiPropertyOptional({ example: 'Perfil padrão para Simples Nacional' })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean = true;

  @ApiPropertyOptional({
    default: false,
    description: 'Apenas um perfil pode ser padrão por regime tributário',
  })
  @IsBoolean()
  @IsOptional()
  padrao?: boolean = false;
}
