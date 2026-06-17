import { ApiProperty } from '@nestjs/swagger';
import { PaymentEnvironment } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class SetChannelConfigDto {
  @ApiProperty({
    example: 'uuid-do-provider',
    description: 'ID do PaymentProvider a vincular ao canal',
  })
  @IsString()
  @IsNotEmpty()
  provider_id!: string;

  @ApiProperty({ enum: PaymentEnvironment, example: PaymentEnvironment.PRODUCAO })
  @IsEnum(PaymentEnvironment)
  ambiente!: PaymentEnvironment;
}
