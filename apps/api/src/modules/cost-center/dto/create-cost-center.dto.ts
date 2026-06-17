import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCostCenterDto {
  @ApiProperty({ example: 'Logística Varejo' })
  @IsString()
  @MaxLength(120)
  nome!: string;

  @ApiPropertyOptional({ example: 'Custos relacionados à logística do varejo' })
  @IsString()
  @IsOptional()
  descricao?: string;
}
