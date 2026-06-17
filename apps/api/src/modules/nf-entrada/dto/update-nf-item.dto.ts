import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateNfItemDto {
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsUUID()
  @IsOptional()
  brand_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lote_numero?: string;

  @IsISO8601()
  @IsOptional()
  data_validade?: string;

  @IsISO8601()
  @IsOptional()
  data_fabricacao?: string;
}
