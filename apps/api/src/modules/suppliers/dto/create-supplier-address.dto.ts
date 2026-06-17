import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSupplierAddressDto {
  @ApiProperty({ example: 'Sede', description: 'Rótulo do endereço', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  label!: string;

  @ApiProperty({ example: '01310100', description: 'CEP (8 dígitos, sem hífen)' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'cep deve ter exatamente 8 dígitos numéricos' })
  cep!: string;

  @ApiProperty({ example: 'Av. Paulista', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  logradouro!: string;

  @ApiProperty({ example: '1234', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  numero!: string;

  @ApiPropertyOptional({ example: 'Sala 42', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  complemento?: string;

  @ApiProperty({ example: 'Bela Vista', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  bairro!: string;

  @ApiProperty({ example: 'São Paulo', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  cidade!: string;

  @ApiProperty({ example: 'SP', description: 'UF (2 letras maiúsculas)' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'estado deve ser a sigla UF com 2 letras maiúsculas' })
  estado!: string;
}
