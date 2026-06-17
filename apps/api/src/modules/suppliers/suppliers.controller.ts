import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { CreateSupplierAddressDto } from './dto/create-supplier-address.dto';
import { CreateSupplierContactDto } from './dto/create-supplier-contact.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { LinkBrandsDto } from './dto/link-brands.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierAddressDto } from './dto/update-supplier-address.dto';
import { UpdateSupplierContactDto } from './dto/update-supplier-contact.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth('access-token')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // ─── Suppliers ───────────────────────────────────────────────────────────────

  @Get()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar fornecedores com paginação e filtros' })
  findAll(@Query() query: ListSuppliersDto, @CurrentUser() user: JwtSystemPayload) {
    return this.suppliersService.findAll(query, user);
  }

  /**
   * NOTE: This static route must be declared BEFORE /:id to avoid NestJS
   * resolving "by-document" as an :id parameter.
   */
  @Get('by-document/:document')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Buscar fornecedor por CNPJ/CPF (apenas dígitos)' })
  findByDocument(
    @Param('document') document: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.suppliersService.findByDocument(document, user);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obter um fornecedor pelo ID' })
  findById(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.suppliersService.findById(id, user);
  }

  @Post()
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo fornecedor' })
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: JwtSystemPayload) {
    return this.suppliersService.create(dto, user);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar dados de um fornecedor' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.suppliersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativar um fornecedor',
    description:
      'Desativa o fornecedor (soft-delete via flag active=false). ' +
      'Retorna 409 se houver notas fiscais vinculadas. ' +
      // TODO: adicionar endpoints de upload/remoção de logo quando o módulo de storage estiver disponível.
      'Endpoints de logo (upload/remoção) serão adicionados quando o módulo de storage estiver implementado.',
  })
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload): Promise<void> {
    return this.suppliersService.deactivate(id, user);
  }

  // ─── Addresses ───────────────────────────────────────────────────────────────

  @Post(':id/addresses')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar endereço a um fornecedor' })
  addAddress(
    @Param('id') id: string,
    @Body() dto: CreateSupplierAddressDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.suppliersService.addAddress(id, dto, user);
  }

  @Patch(':id/addresses/:addressId')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar endereço de um fornecedor' })
  updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateSupplierAddressDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.suppliersService.updateAddress(id, addressId, dto, user);
  }

  @Delete(':id/addresses/:addressId')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover endereço de um fornecedor' })
  deleteAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.suppliersService.deleteAddress(id, addressId, user);
  }

  // ─── Contacts ────────────────────────────────────────────────────────────────

  @Post(':id/contacts')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar contato a um fornecedor' })
  addContact(
    @Param('id') id: string,
    @Body() dto: CreateSupplierContactDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.suppliersService.addContact(id, dto, user);
  }

  @Patch(':id/contacts/:contactId')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar contato de um fornecedor' })
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateSupplierContactDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.suppliersService.updateContact(id, contactId, dto, user);
  }

  @Delete(':id/contacts/:contactId')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover contato de um fornecedor' })
  deleteContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.suppliersService.deleteContact(id, contactId, user);
  }

  // ─── Brand links ─────────────────────────────────────────────────────────────

  @Post(':id/brands')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vincular marcas a um fornecedor' })
  linkBrands(
    @Param('id') id: string,
    @Body() dto: LinkBrandsDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.suppliersService.linkBrands(id, dto.brand_ids, user);
  }

  @Delete(':id/brands/:brandId')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desvincular uma marca de um fornecedor' })
  unlinkBrand(
    @Param('id') id: string,
    @Param('brandId') brandId: string,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.suppliersService.unlinkBrand(id, brandId, user);
  }
}
