import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, StockMovementType, SystemRole } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { QueryStockDto } from './dto/query-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { StockEventsService } from './stock-events.service';
import { StockRepository } from './stock.repository';

@Injectable()
export class StockService {
  constructor(
    private readonly repository: StockRepository,
    private readonly tenancy: TenancyService,
    private readonly events: StockEventsService,
  ) {}

  // ─── Ajuste manual ────────────────────────────────────────────────────────────

  /**
   * Cria um ajuste manual de estoque (MANUAL_ENTRY ou MANUAL_EXIT).
   *
   * Regras:
   * - Apenas MANUAL_ENTRY e MANUAL_EXIT são aceitos; o DTO valida isso.
   * - MANUAL_EXIT exige `notes` (422 se ausente).
   * - MANUAL_EXIT com resultado negativo só é permitido para ADMINISTRADOR.
   *   OPERADOR_ESTOQUE_COMPRAS recebe 422 se a saída deixaria o saldo negativo.
   * - A quantity é sempre positiva no DTO; a conversão para negativo é feita aqui para saídas.
   */
  async createManualMovement(dto: CreateMovementDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);

    // MANUAL_EXIT exige observação
    if (dto.type === StockMovementType.MANUAL_EXIT && !dto.notes?.trim()) {
      throw new UnprocessableEntityException(
        'Observação (notes) é obrigatória para movimentações do tipo MANUAL_EXIT',
      );
    }

    const isExit =
      dto.type === StockMovementType.MANUAL_EXIT;

    // Para saídas: verificar saldo antes de inserir (exceto ADMINISTRADOR)
    if (isExit && user.role !== SystemRole.ADMINISTRADOR) {
      const currentBalance = await this.repository.getLotBalance(dto.lot_id, unitId);
      if (currentBalance - dto.quantity < 0) {
        throw new UnprocessableEntityException(
          `Estoque insuficiente. Saldo atual: ${currentBalance}. ` +
            'Use uma conta com perfil ADMINISTRADOR para forçar saldo negativo.',
        );
      }
    }

    // Quantidade negativa para saídas
    const quantity = isExit
      ? new Prisma.Decimal(-dto.quantity)
      : new Prisma.Decimal(dto.quantity);

    const movement = await this.repository.createMovement({
      unidade_id: unitId,
      product_id: dto.product_id,
      lot_id: dto.lot_id,
      type: dto.type,
      quantity,
      reference_id: dto.reference_id,
      reference_type: dto.reference_type,
      idempotency_key: dto.idempotency_key,
      notes: dto.notes,
      created_by: user.sub,
    });

    // Verificar estoque mínimo após inserção de entrada
    if (!isExit) {
      await this._checkAndAlertLowStock(dto.product_id, unitId);
    }

    return movement;
  }

  // ─── Reserva FIFO ─────────────────────────────────────────────────────────────

  /**
   * Reserva estoque em ordem FIFO para uma venda.
   * Usa SELECT FOR UPDATE para prevenir overselling concorrente.
   * Dispara alerta de estoque baixo se necessário após a reserva.
   *
   * @throws ConflictException se não houver lotes ativos ou estoque insuficiente.
   */
  async reserve(dto: ReserveStockDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);

    const allocations = await this.repository.reserveFifo(
      unitId,
      dto.product_id,
      dto.quantity,
      dto.idempotency_key,
      dto.reference_id,
      user.sub,
    );

    // Verificar estoque mínimo após reserva
    await this._checkAndAlertLowStock(dto.product_id, unitId);

    return { allocations };
  }

  // ─── Consultas ────────────────────────────────────────────────────────────────

  /**
   * Resumo de estoque paginado com filtros opcionais.
   * Se `low_stock=true`, retorna apenas produtos abaixo do estoque mínimo.
   */
  async getStockSummary(filters: QueryStockDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { page = 1, limit = 20, product_id, category_id, low_stock } = filters;

    const result = await this.repository.getStockSummary(
      unitId,
      { product_id, category_id },
      { page, limit },
    );

    if (low_stock) {
      const filtered = result.data.filter((row) => row.is_low_stock);
      return { ...result, data: filtered, total: filtered.length };
    }

    return result;
  }

  /**
   * Saldo do estoque de um produto, discriminado por lote (inclui histórico de lotes zerados).
   * @throws NotFoundException se o produto não existir na unidade.
   */
  async getProductStock(productId: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);

    const [totalBalance, lotBalances] = await Promise.all([
      this.repository.getProductBalance(productId, unitId),
      this.repository.getLotBalancesByProduct(productId, unitId),
    ]);

    return { product_id: productId, total_balance: totalBalance, lots: lotBalances };
  }

  /**
   * Saldo e histórico de movimentações de um lote específico.
   * @throws NotFoundException se o lote não pertencer à unidade.
   */
  async getLotStock(
    lotId: string,
    user: JwtSystemPayload,
    pagination: { page: number; limit: number },
  ) {
    const unitId = await this.tenancy.resolveUnitId(user);

    const balance = await this.repository.getLotBalance(lotId, unitId);
    const movements = await this.repository.findMovements(
      unitId,
      { lot_id: lotId },
      pagination,
    );

    return { lot_id: lotId, balance, movements };
  }

  /** Lista movimentações paginadas com filtros. */
  async listMovements(filters: QueryMovementsDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { page = 1, limit = 20, product_id, lot_id, type, date_from, date_to } = filters;

    return this.repository.findMovements(
      unitId,
      { product_id, lot_id, type, date_from, date_to },
      { page, limit },
    );
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  private async _checkAndAlertLowStock(productId: string, unitId: string): Promise<void> {
    const balance = await this.repository.getProductBalance(productId, unitId);

    // Buscar min_stock do produto
    // TODO: quando PricingEngine ou Products exportar esse dado, consumir do service correspondente.
    // Por ora, fazemos a query direta via repository de movimentações (produto está relacionado).
    const summary = await this.repository.getStockSummary(
      unitId,
      { product_id: productId },
      { page: 1, limit: 1 },
    );

    const productRow = summary.data[0];
    if (!productRow) return;

    if (balance < productRow.min_stock) {
      this.events.publishLowStockAlert(productId, unitId, balance, productRow.min_stock);
    }
  }
}
