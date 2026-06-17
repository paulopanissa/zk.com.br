import { PartialType } from '@nestjs/swagger';
import { CreateCompanyPhoneDto } from './create-company-phone.dto';

export class UpdateCompanyPhoneDto extends PartialType(CreateCompanyPhoneDto) {}
