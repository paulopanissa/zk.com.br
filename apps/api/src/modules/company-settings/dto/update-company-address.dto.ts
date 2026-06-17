import { PartialType } from '@nestjs/swagger';
import { CreateCompanyAddressDto } from './create-company-address.dto';

export class UpdateCompanyAddressDto extends PartialType(CreateCompanyAddressDto) {}
