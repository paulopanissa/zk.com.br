import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SystemLoginDto {
  @ApiProperty({ example: 'admin@petshop.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'senha_secreta_123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
