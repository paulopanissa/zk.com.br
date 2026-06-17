import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
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
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { QueryStockDto } from './dto/query-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@ApiBearerAuth('access-token')
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  // ─── Resumo de estoque ───────────────────────────────────────────────────────

  @Get()
  @Roles(
    SystemRole.ADMINISTRADOR,
    SystemRole.OPERADOR_ESTOQUE_COMPRAS,
    SystemRole.OPERADOR_PDV,
  )
  @ApiOperation({
    summary: 'Resumo de estoque por produto',
    description:
      'Retorna saldo consolidado por produto (soma de todos os lotes), ' +
      'contagem de lotes e indicador de estoque baixo. ' +
      'Use `low_stock=true` para filtrar apenas produtos abaixo do mínimo.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de saldos por produto' })
  getStockSummary(
    @Query() filters: QueryStockDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.getStockSummary(filters, user);
  }

  // ─── Estoque de um produto ───────────────────────────────────────────────────

  @Get('product/:productId')
  @Roles(
    SystemRole.ADMINISTRADOR,
    SystemRole.OPERADOR_ESTOQUE_COMPRAS,
    SystemRole.OPERADOR_PDV,
  )
  @ApiOperation({
    summary: 'Saldo do estoque de um produto discriminado por lote',
    description:
      'Retorna o saldo total e o detalhamento por lote, incluindo lotes com saldo zero ' +
      '(histórico completo). Lotes ordenados por FIFO (validade ASC, criação ASC).',
  })
  @ApiParam({ name: 'productId', description: 'UUID do produto' })
  @ApiResponse({ status: 200, description: 'Saldo do produto por lote' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  getProductStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.getProductStock(productId, user);
  }

  // ─── Estoque de um lote ──────────────────────────────────────────────────────

  @Get('lot/:lotId')
  @Roles(
    SystemRole.ADMINISTRADOR,
    SystemRole.OPERADOR_ESTOQUE_COMPRAS,
    SystemRole.OPERADOR_PDV,
  )
  @ApiOperation({
    summary: 'Saldo e histórico de movimentações de um lote',
    description: 'Retorna o saldo atual do lote e suas movimentações paginadas (mais recentes primeiro).',
  })
  @ApiParam({ name: 'lotId', description: 'UUID do lote' })
  @ApiResponse({ status: 200, description: 'Saldo e movimentações do lote' })
  @ApiResponse({ status: 404, description: 'Lote não encontrado' })
  getLotStock(
    @Param('lotId', ParseUUIDPipe) lotId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.getLotStock(lotId, user, { page, limit });
  }

  // ─── Movimentações ───────────────────────────────────────────────────────────

  @Get('movements')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @ApiOperation({
    summary: 'Listar movimentações de estoque paginadas',
    description:
      'Retorna o histórico de movimentações com filtros opcionais por produto, lote, ' +
      'tipo de movimentação e intervalo de datas.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de movimentações' })
  listMovements(
    @Query() filters: QueryMovementsDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.listMovements(filters, user);
  }

  @Post('movements')
  @HttpCode(HttpStatus.CREATED)
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @ApiOperation({
    summary: 'Criar ajuste manual de estoque',
    description:
      'Cria uma movimentação de ajuste manual (MANUAL_ENTRY ou MANUAL_EXIT). ' +
      'MANUAL_EXIT exige o campo `notes`. ' +
      'OPERADOR_ESTOQUE_COMPRAS não pode gerar saldo negativo; apenas ADMINISTRADOR pode. ' +
      'Outros tipos (SALE_OUT, PURCHASE_ENTRY, etc.) são gerados automaticamente pelos módulos proprietários.',
  })
  @ApiResponse({ status: 201, description: 'Movimentação criada' })
  @ApiResponse({ status: 409, description: 'Estoque insuficiente (OPERADOR)' })
  @ApiResponse({ status: 422, description: 'notes obrigatório para MANUAL_EXIT' })
  createMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.createManualMovement(dto, user);
  }

  // ─── Reserva FIFO ────────────────────────────────────────────────────────────

  @Post('reserve')
  @HttpCode(HttpStatus.CREATED)
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Reservar estoque por FIFO',
    description:
      'Reserva a quantidade solicitada do produto usando o algoritmo FIFO ' +
      '(lotes com validade mais próxima são consumidos primeiro). ' +
      'Usa SELECT FOR UPDATE para prevenir overselling concorrente. ' +
      'A operação é idempotente: envios repetidos com a mesma `idempotency_key` ' +
      'retornam o resultado da primeira execução.',
  })
  @ApiResponse({ status: 201, description: 'Reserva realizada; retorna alocações por lote' })
  @ApiResponse({ status: 409, description: 'Sem lotes ativos ou estoque insuficiente' })
  reserveStock(
    @Body() dto: ReserveStockDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.reserve(dto, user);
  }
}
