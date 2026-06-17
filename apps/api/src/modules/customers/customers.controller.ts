import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateFieldDefinitionDto } from './dto/create-field-definition.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { ReorderFieldsDto } from './dto/reorder-fields.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateFieldDefinitionDto } from './dto/update-field-definition.dto';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ─── Field Definitions ───────────────────────────────────────────────────────

  @Get('field-definitions')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar definições de campos dinâmicos da unidade' })
  listFieldDefinitions(@CurrentUser() user: JwtSystemPayload) {
    return this.customersService.listFieldDefinitions(user);
  }

  @Post('field-definitions')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova definição de campo dinâmico' })
  createFieldDefinition(
    @Body() dto: CreateFieldDefinitionDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.customersService.createFieldDefinition(dto, user);
  }

  @Patch('field-definitions/reorder')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reordenar campos dinâmicos',
    description: 'Atualiza a ordem de exibição de múltiplos campos em lote via transação.',
  })
  reorderFieldDefinitions(
    @Body() dto: ReorderFieldsDto,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.customersService.reorderFieldDefinitions(dto, user);
  }

  @Patch('field-definitions/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar definição de campo dinâmico' })
  @ApiParam({ name: 'id', description: 'ID da definição de campo' })
  updateFieldDefinition(
    @Param('id') id: string,
    @Body() dto: UpdateFieldDefinitionDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.customersService.updateFieldDefinition(id, dto, user);
  }

  @Delete('field-definitions/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativar definição de campo dinâmico (soft delete)',
    description: 'Marca o campo como inativo. Dados históricos em dados_dinamicos são preservados.',
  })
  @ApiParam({ name: 'id', description: 'ID da definição de campo' })
  deleteFieldDefinition(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.customersService.deactivateFieldDefinition(id, user);
  }

  // ─── Customers ───────────────────────────────────────────────────────────────

  @Get()
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Listar clientes (paginado)',
    description: 'Busca por nome (pg_trgm fuzzy), telefone (prefixo), CPF/CNPJ (hash), email.',
  })
  listCustomers(
    @Query() query: QueryCustomerDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.customersService.listCustomers(query, user);
  }

  @Post()
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastrar cliente (requer consentimento LGPD)',
    description: 'CPF/CNPJ validado por dígito verificador e criptografado (AES-256-GCM). Consentimento obrigatório.',
  })
  createCustomer(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: JwtSystemPayload,
    @Ip() ip: string,
  ) {
    return this.customersService.createCustomer(dto, user, ip);
  }

  @Get(':id/export')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Exportar dados do titular em texto claro (LGPD — Art. 18, IV)',
    description: 'Descriptografa CPF/CNPJ e data_nascimento. Registra log de EXPORTACAO.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  exportCustomer(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
    @Ip() ip: string,
  ) {
    return this.customersService.exportCustomer(id, user, ip);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Detalhar cliente',
    description: 'PII não retornada em claro neste endpoint. Use /export. Registra log de LEITURA.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  getCustomerById(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
    @Ip() ip: string,
  ) {
    return this.customersService.getCustomerById(id, user, ip);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Atualizar cliente',
    description: 'Registra log de ATUALIZACAO com campos alterados.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: JwtSystemPayload,
    @Ip() ip: string,
  ) {
    return this.customersService.updateCustomer(id, dto, user, ip);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Anonimizar cliente (LGPD — direito ao esquecimento)',
    description: 'PII substituída por [ANONIMIZADO]. Registro mantido para integridade referencial. Registra log de EXCLUSAO.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  deleteCustomer(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
    @Ip() ip: string,
  ): Promise<void> {
    return this.customersService.deleteCustomer(id, user, ip);
  }
}
