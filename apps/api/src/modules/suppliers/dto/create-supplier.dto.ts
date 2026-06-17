import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    example: '12345678000195',
    description: 'CNPJ (14 dígitos) ou CPF (11 dígitos), apenas dígitos',
  })
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'document deve ter 11 (CPF) ou 14 (CNPJ) dígitos numéricos',
  })
  document!: string;

  @ApiProperty({ example: 'Empresa Fornecedora LTDA', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  razao_social!: string;

  @ApiPropertyOptional({ example: 'Fornecedora XYZ', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nome_fantasia?: string;

  @ApiPropertyOptional({ example: 'contato@fornecedora.com.br' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '11999990000', description: 'Apenas dígitos' })
  @IsString()
  @IsOptional()
  @Matches(/^\d+$/, { message: 'phone deve conter apenas dígitos' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://fornecedora.com.br' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'Observações internas sobre o fornecedor' })
  @IsString()
  @IsOptional()
  notes?: string;
}
