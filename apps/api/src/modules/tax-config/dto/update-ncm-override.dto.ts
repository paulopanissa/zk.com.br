import { PartialType } from '@nestjs/swagger';
import { CreateNcmOverrideDto } from './create-ncm-override.dto';

export class UpdateNcmOverrideDto extends PartialType(CreateNcmOverrideDto) {}
