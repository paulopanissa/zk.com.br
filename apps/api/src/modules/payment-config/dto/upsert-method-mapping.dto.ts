import { ApiProperty } from '@nestjs/swagger';
import { PaymentChannel, PaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpsertMethodMappingDto {
  @ApiProperty({ enum: PaymentChannel, example: PaymentChannel.PDV })
  @IsEnum(PaymentChannel)
  canal!: PaymentChannel;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  metodo!: PaymentMethod;

  @ApiProperty({
    example: 'uuid-do-provider',
    description: 'ID do PaymentProvider responsável por este método',
  })
  @IsString()
  @IsNotEmpty()
  provider_id!: string;

  @ApiProperty({
    example: 250,
    description: 'Taxa percentual em centésimos de porcento (ex: 250 = 2,50%)',
  })
  @IsInt()
  @Min(0)
  taxa_percentual!: number;

  @ApiProperty({
    example: 0,
    description: 'Taxa fixa em centavos (ex: 100 = R$ 1,00)',
  })
  @IsInt()
  @Min(0)
  taxa_fixa_centavos!: number;
}
