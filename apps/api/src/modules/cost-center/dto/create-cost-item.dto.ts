import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoCusto } from '@prisma/client';

export class CreateCostItemDto {
  @ApiProperty({ example: 'Sacola' })
  @IsString()
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ enum: TipoCusto, description: 'FIXO = valor absoluto em centavos; VARIAVEL = percentual em basis points' })
  @IsEnum(TipoCusto)
  tipo!: TipoCusto;

  @ApiPropertyOptional({
    description: 'Valor em centavos. Obrigatório para tipo FIXO. Ex: 1500 = R$ 15,00',
    example: 1500,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  valor_centavos?: number;

  @ApiPropertyOptional({
    description: 'Percentual em basis points (1% = 100 bps). Obrigatório para tipo VARIAVEL. Ex: 250 = 2,5%',
    example: 250,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  percentual_bps?: number;

  @ApiPropertyOptional({ example: 'Sacola biodegradável padrão' })
  @IsString()
  @IsOptional()
  descricao?: string;
}
