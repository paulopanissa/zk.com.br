import { ApiProperty } from '@nestjs/swagger';
import { PaymentEnvironment } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CredentialItemDto {
  @ApiProperty({ example: 'ACCESS_TOKEN', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  chave!: string;

  @ApiProperty({ example: 'APP_USR-xxxx', description: 'Valor da credencial (será criptografado)' })
  @IsString()
  @IsNotEmpty()
  valor!: string;

  @ApiProperty({ enum: PaymentEnvironment, example: PaymentEnvironment.SANDBOX })
  @IsEnum(PaymentEnvironment)
  ambiente!: PaymentEnvironment;
}

export class UpsertCredentialsDto {
  @ApiProperty({ type: [CredentialItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CredentialItemDto)
  credentials!: CredentialItemDto[];
}
