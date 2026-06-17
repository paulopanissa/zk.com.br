import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Maria Oliveira' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nome?: string;

  @ApiPropertyOptional({ example: '11999997777' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefone_principal?: string;

  @ApiPropertyOptional({ example: 'novo@email.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '123.456.789-09', description: 'CPF ou CNPJ' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_, value) => value !== undefined && value !== null)
  cpf_cnpj?: string;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Data de nascimento (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data_nascimento deve ser no formato YYYY-MM-DD' })
  data_nascimento?: string;

  @ApiPropertyOptional({ example: { cor_preferida: 'verde' } })
  @IsObject()
  @IsOptional()
  dados_dinamicos?: Record<string, unknown>;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
