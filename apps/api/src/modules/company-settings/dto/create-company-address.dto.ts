import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoEnderecoEmpresa } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCompanyAddressDto {
  @ApiProperty({ enum: TipoEnderecoEmpresa, example: TipoEnderecoEmpresa.MATRIZ })
  @IsEnum(TipoEnderecoEmpresa)
  tipo!: TipoEnderecoEmpresa;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  logradouro!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  numero!: string;

  @ApiPropertyOptional({ example: 'Sala 1' })
  @IsString()
  @IsOptional()
  complemento?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  bairro!: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  municipio!: string;

  @ApiProperty({ example: 'SP', description: 'Código UF com 2 letras maiúsculas (ex: SP)' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'uf deve ser código de 2 letras maiúsculas (ex: SP)' })
  uf!: string;

  @ApiProperty({ example: '01310100', description: 'CEP com 8 dígitos, sem hífen' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'cep deve ter 8 dígitos' })
  cep!: string;

  @ApiPropertyOptional({ example: '3550308' })
  @IsString()
  @IsOptional()
  codigo_ibge?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  principal?: boolean;
}
