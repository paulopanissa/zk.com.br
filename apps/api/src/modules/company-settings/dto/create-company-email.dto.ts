import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoEmailEmpresa } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateCompanyEmailDto {
  @ApiProperty({ enum: TipoEmailEmpresa, example: TipoEmailEmpresa.COMERCIAL })
  @IsEnum(TipoEmailEmpresa)
  tipo!: TipoEmailEmpresa;

  @ApiProperty({ example: 'contato@empresa.com.br' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  principal?: boolean;
}
