import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PaymentEntryDto {
  @ApiProperty({ enum: PaymentMethod, description: 'Método de pagamento' })
  @IsEnum(PaymentMethod)
  metodo!: PaymentMethod;

  @ApiProperty({ description: 'Valor em centavos' })
  @IsInt()
  @Min(1)
  valor_centavos!: number;
}

export class CheckoutDto {
  @ApiProperty({ type: [PaymentEntryDto], description: 'Lista de pagamentos (ao menos um)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentEntryDto)
  pagamentos!: PaymentEntryDto[];

  @ApiPropertyOptional({ description: 'Observação do checkout' })
  @IsString()
  @IsOptional()
  observacao?: string;
}
