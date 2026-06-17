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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { AddItemDto } from './dto/add-item.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateVendaDto } from './dto/create-venda.dto';
import { QueryVendaDto } from './dto/query-venda.dto';
import { ReconcilePaymentDto } from './dto/reconcile-payment.dto';
import { SetDiscountDto } from './dto/set-discount.dto';
import { SyncOfflineDto } from './dto/sync-offline.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { VendasService } from './vendas.service';

@ApiTags('Vendas (PDV)')
@ApiBearerAuth()
@Controller('vendas')
export class VendasController {
  constructor(private readonly service: VendasService) {}

  // ─── Venda ───────────────────────────────────────────────────────────────────

  @Post()
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Abrir carrinho / criar venda',
    description:
      'Cria uma nova venda com status ABERTA. Se sync_id for enviado e já existir, retorna a venda existente (idempotente).',
  })
  @ApiResponse({ status: 201, description: 'Venda criada' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  create(@Body() dto: CreateVendaDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Listar vendas com filtros e paginação',
    description: 'Retorna lista paginada de vendas da unidade autenticada.',
  })
  findAll(@Query() query: QueryVendaDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiParam({ name: 'id', description: 'ID da venda (UUID)' })
  @ApiOperation({ summary: 'Detalhe da venda com itens e pagamentos' })
  @ApiResponse({ status: 404, description: 'Venda não encontrada' })
  findById(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findById(id, user);
  }

  // ─── Itens ────────────────────────────────────────────────────────────────────

  @Post(':id/items')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiParam({ name: 'id', description: 'ID da venda (UUID)' })
  @ApiOperation({
    summary: 'Adicionar item ao carrinho',
    description: 'O preço unitário é capturado automaticamente a partir da precificação do produto.',
  })
  @ApiResponse({ status: 404, description: 'Venda ou produto não encontrado' })
  @ApiResponse({ status: 422, description: 'Venda não está ABERTA ou produto sem precificação' })
  addItem(
    @Param('id') id: string,
    @Body() dto: AddItemDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.addItem(id, dto, user);
  }

  @Put(':id/items/:itemId')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiParam({ name: 'id', description: 'ID da venda (UUID)' })
  @ApiParam({ name: 'itemId', description: 'ID do item (UUID)' })
  @ApiOperation({ summary: 'Atualizar quantidade ou desconto do item' })
  @ApiResponse({ status: 404, description: 'Venda ou item não encontrado' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updateItem(id, itemId, dto, user);
  }

  @Delete(':id/items/:itemId')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiParam({ name: 'id', description: 'ID da venda (UUID)' })
  @ApiParam({ name: 'itemId', description: 'ID do item (UUID)' })
  @ApiOperation({ summary: 'Remover item do carrinho' })
  @ApiResponse({ status: 404, description: 'Venda ou item não encontrado' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.removeItem(id, itemId, user);
  }

  // ─── Desconto ────────────────────────────────────────────────────────────────

  @Patch(':id/desconto')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiParam({ name: 'id', description: 'ID da venda (UUID)' })
  @ApiOperation({
    summary: 'Aplicar desconto manual no total da venda',
    description: 'Sobrescreve o desconto total em centavos. Não pode exceder o total bruto.',
  })
  @ApiResponse({ status: 400, description: 'Desconto maior que o total bruto' })
  setDiscount(
    @Param('id') id: string,
    @Body() dto: SetDiscountDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.setDiscount(id, dto, user);
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────────

  @Post(':id/checkout')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiParam({ name: 'id', description: 'ID da venda (UUID)' })
  @ApiOperation({
    summary: 'Finalizar venda',
    description:
      'Executa atomicamente: re-verifica status, reserva estoque FIFO por item, registra pagamentos e atualiza status para FINALIZADA.',
  })
  @ApiResponse({ status: 400, description: 'Total de pagamentos insuficiente' })
  @ApiResponse({ status: 409, description: 'Estoque insuficiente' })
  @ApiResponse({ status: 422, description: 'Venda sem itens ou não ABERTA' })
  checkout(
    @Param('id') id: string,
    @Body() dto: CheckoutDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.checkout(id, dto, user);
  }

  @Post(':id/cancelar')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID da venda (UUID)' })
  @ApiOperation({
    summary: 'Cancelar venda',
    description:
      'Cancela a venda. Se estava FINALIZADA, reverte os movimentos de estoque (SALE_RETURN idempotente) e cancela os pagamentos.',
  })
  @ApiResponse({ status: 422, description: 'Venda já cancelada' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.cancel(id, user);
  }

  // ─── Sync Offline ─────────────────────────────────────────────────────────────

  @Post('sync')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Sincronizar vendas offline em lote (idempotente por sync_id)',
    description:
      'Recebe um array de vendas geradas offline. Cada venda é processada independentemente; erros de um item não afetam os demais. Vendas com sync_id já existente são marcadas como skipped.',
  })
  syncOffline(@Body() dto: SyncOfflineDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.syncOffline(dto, user);
  }

  // ─── Pagamentos ───────────────────────────────────────────────────────────────

  @Patch(':id/pagamentos/:pagId/reconciliar')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiParam({ name: 'id', description: 'ID da venda (UUID)' })
  @ApiParam({ name: 'pagId', description: 'ID do pagamento (UUID)' })
  @ApiOperation({
    summary: 'Reconciliar pagamento pendente',
    description:
      'Marca um pagamento como PAGO. Usado para conciliar pagamentos assíncronos (ex: PIX, boleto). Apenas ADMINISTRADOR.',
  })
  @ApiResponse({ status: 404, description: 'Venda ou pagamento não encontrado' })
  @ApiResponse({ status: 409, description: 'Pagamento já reconciliado' })
  reconcilePayment(
    @Param('id') id: string,
    @Param('pagId') pagId: string,
    @Body() dto: ReconcilePaymentDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.reconcilePayment(id, pagId, dto, user);
  }
}
