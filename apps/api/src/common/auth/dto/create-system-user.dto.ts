import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateSystemUserDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'joao@petshop.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: SystemRole })
  @IsEnum(SystemRole)
  role!: SystemRole;

  @ApiPropertyOptional({ format: 'uuid', description: 'null = acesso a todas as unidades' })
  @IsOptional()
  @IsUUID()
  unidade_id?: string;
}
