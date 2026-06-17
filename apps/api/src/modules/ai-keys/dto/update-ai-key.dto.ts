import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAiKeyDto {
  @ApiPropertyOptional({ example: 'backup' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  key?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
