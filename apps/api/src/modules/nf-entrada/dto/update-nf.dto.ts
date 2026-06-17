import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateNfDto {
  @IsUUID()
  @IsOptional()
  fornecedor_id?: string;

  @IsISO8601()
  @IsOptional()
  data_entrada?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  observacao?: string;
}
