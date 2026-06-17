import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoImpostoNcm } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateNcmOverrideDto {
  @ApiProperty({
    description: 'Código NCM com exatamente 8 dígitos numéricos',
    example: '12345678',
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'ncm deve conter exatamente 8 dígitos numéricos' })
  ncm!: string;

  @ApiProperty({ enum: TipoImpostoNcm, example: TipoImpostoNcm.IPI })
  @IsEnum(TipoImpostoNcm)
  imposto!: TipoImpostoNcm;

  @ApiProperty({
    description:
      'Alíquota em centésimos de porcento. Aceita float (12.5) ou inteiro (1250). ' +
      '12% = 1200, 0.65% = 65, 12.5% = 1250.',
    example: 1000,
  })
  @Transform(({ value }) => {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value);
    return n < 100 ? Math.round(n * 100) : Math.round(n);
  })
  @IsInt()
  @Min(0)
  aliquota_percentual!: number;

  @ApiPropertyOptional({ example: 'Alíquota especial para NCM 12345678', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  descricao?: string;
}
