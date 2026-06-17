import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { CreateLotDto } from './dto/create-lot.dto';
import { QueryExpiringDto } from './dto/query-expiring.dto';
import { QueryLotsDto } from './dto/query-lots.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { LotsService } from './lots.service';

@ApiTags('lots')
@ApiBearerAuth('access-token')
@Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
@Controller('lots')
export class LotsController {
  constructor(private readonly service: LotsService) {}

  // ─── Rotas estáticas ANTES das paramétricas (:id) ─────────────────────────

  @Get('expiring')
  @ApiOperation({
    summary: 'Lotes vencendo nos próximos N dias',
    description:
      'Retorna lotes ativos com data de validade definida e dentro da janela especificada. Padrão: 30 dias.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de lotes próximos do vencimento' })
  findExpiring(
    @Query() query: QueryExpiringDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.findExpiring(query, user);
  }

  @Get('by-product/:productId')
  @ApiOperation({
    summary: 'Lotes de um produto em ordem FIFO (validade mais próxima primeiro)',
    description: 'Lista todos os lotes de um produto, ordenados por validade ASC (FIFO), com paginação.',
  })
  @ApiParam({ name: 'productId', description: 'UUID do produto' })
  @ApiResponse({ status: 200, description: 'Lista paginada de lotes do produto em ordem FIFO' })
  findByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.findByProduct(productId, { page, limit }, user);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar lotes paginados com filtros' })
  @ApiResponse({ status: 200, description: 'Lista paginada de lotes' })
  findAll(@Query() filters: QueryLotsDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findAll(filters, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar lote por ID',
    description: 'Retorna os dados do lote incluindo o campo `balance` (saldo calculado).',
  })
  @ApiParam({ name: 'id', description: 'UUID do lote' })
  @ApiResponse({ status: 200, description: 'Lote encontrado com saldo' })
  @ApiResponse({ status: 404, description: 'Lote não encontrado' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar lote' })
  @ApiResponse({ status: 201, description: 'Lote criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Código de lote já existente para este produto' })
  create(@Body() dto: CreateLotDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar metadados do lote',
    description:
      'Permite alterar code, expires_at, manufactured_at, tags, notes e active. ' +
      'Os campos product_id, invoice_item_id e quantity_received são imutáveis.',
  })
  @ApiParam({ name: 'id', description: 'UUID do lote' })
  @ApiResponse({ status: 200, description: 'Lote atualizado' })
  @ApiResponse({ status: 404, description: 'Lote não encontrado' })
  @ApiResponse({ status: 409, description: 'Conflito: código já utilizado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLotDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativar lote (soft-delete)',
    description: 'Define active=false. Retorna 409 se o lote possuir saldo em estoque.',
  })
  @ApiParam({ name: 'id', description: 'UUID do lote' })
  @ApiResponse({ status: 204, description: 'Lote desativado' })
  @ApiResponse({ status: 404, description: 'Lote não encontrado' })
  @ApiResponse({ status: 409, description: 'Lote com saldo não pode ser desativado' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.service.deactivate(id, user);
  }
}
