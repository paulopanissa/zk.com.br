import { PartialType } from '@nestjs/swagger';
import { CreateCompanyEmailDto } from './create-company-email.dto';

export class UpdateCompanyEmailDto extends PartialType(CreateCompanyEmailDto) {}
