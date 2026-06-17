import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateNfItemDto {
  @IsInt()
  @Min(1)
  numero_item!: number;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  codigo_produto?: string;

  @IsString()
  @IsOptional()
  @MaxLength(14)
  ean?: string;

  @IsString()
  @MaxLength(500)
  descricao!: string;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  ncm?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4)
  cfop?: string;

  @IsString()
  @IsOptional()
  @MaxLength(6)
  unidade_medida?: string;

  @IsNumber()
  @Min(0)
  quantidade!: number;

  @IsInt()
  @Min(0)
  valor_unitario!: number;

  @IsInt()
  @Min(0)
  valor_total!: number;

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

  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsUUID()
  @IsOptional()
  brand_id?: string;
}

export class CreateNfDto {
  @IsUUID()
  @IsOptional()
  fornecedor_id?: string;

  @IsString()
  @MaxLength(10)
  numero!: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  serie?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{44}$/, { message: 'chave_acesso deve ter exatamente 44 dígitos' })
  chave_acesso?: string;

  @IsISO8601()
  data_emissao!: string;

  @IsISO8601()
  @IsOptional()
  data_entrada?: string;

  @IsInt()
  @Min(0)
  valor_total!: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  observacao?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNfItemDto)
  items!: CreateNfItemDto[];
}
