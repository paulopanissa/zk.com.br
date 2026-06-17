import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoTelefoneEmpresa } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCompanyPhoneDto {
  @ApiProperty({ enum: TipoTelefoneEmpresa, example: TipoTelefoneEmpresa.COMERCIAL })
  @IsEnum(TipoTelefoneEmpresa)
  tipo!: TipoTelefoneEmpresa;

  @ApiPropertyOptional({ example: '+55', description: 'DDI do país (ex: +55)' })
  @IsString()
  @IsOptional()
  ddi?: string;

  @ApiProperty({ example: '11987654321', description: 'Número do telefone, apenas dígitos' })
  @IsString()
  @Matches(/^\d+$/, { message: 'numero deve conter apenas dígitos' })
  numero!: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  principal?: boolean;
}
