import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { validateCpfCnpj } from '../utils/cpf-cnpj.validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Maria Silva', description: 'Nome completo do cliente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nome!: string;

  @ApiProperty({ example: '11999998888', description: 'Telefone principal (somente dígitos ou formatado)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  telefone_principal!: string;

  @ApiPropertyOptional({ example: 'maria@email.com', description: 'E-mail do cliente' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: '123.456.789-09',
    description: 'CPF ou CNPJ (com ou sem máscara). Será validado por módulo-11 e criptografado.',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_, value) => value !== undefined && value !== null)
  cpf_cnpj?: string;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Data de nascimento (ISO 8601 YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data_nascimento deve ser no formato YYYY-MM-DD' })
  data_nascimento?: string;

  @ApiPropertyOptional({
    example: { cor_preferida: 'azul', raca_pet: 'Golden' },
    description: 'Campos dinâmicos definidos pela unidade',
  })
  @IsObject()
  @IsOptional()
  dados_dinamicos?: Record<string, unknown>;

  @ApiProperty({ example: true, description: 'Consentimento LGPD obrigatório (deve ser true)' })
  @IsBoolean()
  consentimento_lgpd!: boolean;

  @ApiProperty({ example: '1.0', description: 'Versão do termo de consentimento aceito' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  consentimento_versao!: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Data/hora do consentimento (ISO 8601)',
  })
  @IsDateString()
  consentimento_em!: string;
}

export function assertCpfCnpjValid(value: string): void {
  if (!validateCpfCnpj(value)) {
    throw new Error(`CPF/CNPJ inválido: ${value}`);
  }
}
