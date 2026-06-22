import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCostCenterDto {
  @ApiProperty({ example: 'Logística Varejo' })
  @IsString()
  @MaxLength(120)
  nome!: string;

  @ApiPropertyOptional({ example: 'Custos relacionados à logística do varejo' })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({
    description:
      'Faturamento mensal total da unidade em centavos — usado para rateio proporcional de custos fixos (método SEBRAE). ' +
      'Ex: faturamento de R$ 4.500/mês → 450000.',
    example: 450000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  faturamento_mensal_centavos?: number;
}
