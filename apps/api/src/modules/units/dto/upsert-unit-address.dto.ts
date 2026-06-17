import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpsertUnitAddressDto {
  @ApiProperty({ example: 'Rua das Flores', description: 'Logradouro (rua, avenida, etc.)' })
  @IsString()
  logradouro!: string;

  @ApiProperty({ example: '123', description: 'Número do endereço' })
  @IsString()
  numero!: string;

  @ApiPropertyOptional({ example: 'Sala 2', description: 'Complemento do endereço' })
  @IsString()
  @IsOptional()
  complemento?: string;

  @ApiProperty({ example: 'Centro', description: 'Bairro' })
  @IsString()
  bairro!: string;

  @ApiProperty({ example: 'São Paulo', description: 'Município' })
  @IsString()
  municipio!: string;

  @ApiProperty({
    example: 'SP',
    description: 'UF — código de 2 letras maiúsculas',
  })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'uf deve ser código de 2 letras maiúsculas (ex: SP)' })
  uf!: string;

  @ApiProperty({
    example: '01310100',
    description: 'CEP com 8 dígitos, apenas números',
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'cep deve ter 8 dígitos' })
  cep!: string;

  @ApiPropertyOptional({
    example: '3550308',
    description: 'Código IBGE do município (7 dígitos)',
  })
  @IsString()
  @IsOptional()
  codigo_ibge?: string;
}
