import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCostCenterDto } from './create-cost-center.dto';

export class UpdateCostCenterDto extends PartialType(CreateCostCenterDto) {
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
