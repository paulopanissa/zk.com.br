import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Royal Canin' })
  @IsString()
  @MaxLength(150)
  name!: string;
}
