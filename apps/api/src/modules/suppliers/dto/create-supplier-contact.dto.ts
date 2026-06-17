import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSupplierContactDto {
  @ApiProperty({ example: 'João Silva', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'Gerente Comercial', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  role?: string;

  @ApiPropertyOptional({ example: 'joao@fornecedora.com.br' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '11988880000', description: 'Apenas dígitos' })
  @IsString()
  @IsOptional()
  @Matches(/^\d+$/, { message: 'phone deve conter apenas dígitos' })
  phone?: string;
}
