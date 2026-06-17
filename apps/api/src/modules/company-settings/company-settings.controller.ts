import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CompanySettingsService } from './company-settings.service';
import { CreateCompanyAddressDto } from './dto/create-company-address.dto';
import { CreateCompanyEmailDto } from './dto/create-company-email.dto';
import { CreateCompanyPhoneDto } from './dto/create-company-phone.dto';
import { UpdateCompanyAddressDto } from './dto/update-company-address.dto';
import { UpdateCompanyEmailDto } from './dto/update-company-email.dto';
import { UpdateCompanyPhoneDto } from './dto/update-company-phone.dto';
import { UpsertCompanySettingsDto } from './dto/upsert-company-settings.dto';

// TODO: Add logo upload/remove endpoints once the Storage module is implemented (S3/R2 integration).

@ApiTags('company-settings')
@ApiBearerAuth('access-token')
@Controller('company-settings')
export class CompanySettingsController {
  constructor(private readonly service: CompanySettingsService) {}

  // ─── Settings ─────────────────────────────────────────────────────────────

  @Get()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obter configurações da empresa' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Criar ou atualizar configurações da empresa (singleton)' })
  upsertSettings(@Body() dto: UpsertCompanySettingsDto) {
    return this.service.upsertSettings(dto);
  }

  // ─── Emails ───────────────────────────────────────────────────────────────

  @Get('emails')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar e-mails da empresa' })
  getEmails() {
    return this.service.getEmails();
  }

  @Post('emails')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Adicionar e-mail à empresa' })
  createEmail(@Body() dto: CreateCompanyEmailDto) {
    return this.service.createEmail(dto);
  }

  @Put('emails/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar e-mail da empresa' })
  updateEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyEmailDto,
  ) {
    return this.service.updateEmail(id, dto);
  }

  @Delete('emails/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover e-mail da empresa' })
  deleteEmail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteEmail(id);
  }

  // ─── Phones ───────────────────────────────────────────────────────────────

  @Get('phones')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar telefones da empresa' })
  getPhones() {
    return this.service.getPhones();
  }

  @Post('phones')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Adicionar telefone à empresa' })
  createPhone(@Body() dto: CreateCompanyPhoneDto) {
    return this.service.createPhone(dto);
  }

  @Put('phones/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar telefone da empresa' })
  updatePhone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyPhoneDto,
  ) {
    return this.service.updatePhone(id, dto);
  }

  @Delete('phones/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover telefone da empresa' })
  deletePhone(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deletePhone(id);
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  @Get('addresses')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar endereços da empresa' })
  getAddresses() {
    return this.service.getAddresses();
  }

  @Post('addresses')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Adicionar endereço à empresa' })
  createAddress(@Body() dto: CreateCompanyAddressDto) {
    return this.service.createAddress(dto);
  }

  @Put('addresses/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar endereço da empresa' })
  updateAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyAddressDto,
  ) {
    return this.service.updateAddress(id, dto);
  }

  @Delete('addresses/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover endereço da empresa' })
  deleteAddress(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteAddress(id);
  }
}
