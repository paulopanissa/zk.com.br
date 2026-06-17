import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCostItemDto } from './create-cost-item.dto';

export class UpdateCostItemDto extends PartialType(CreateCostItemDto) {
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
