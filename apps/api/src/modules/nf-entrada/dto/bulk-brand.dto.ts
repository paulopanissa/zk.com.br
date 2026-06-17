import { IsUUID } from 'class-validator';

export class BulkBrandDto {
  @IsUUID()
  brand_id!: string;
}
