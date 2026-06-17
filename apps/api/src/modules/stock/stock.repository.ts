import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, StockMovement, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tipo para um cliente de transação Prisma passado externamente.
 * Permite que outros serviços participem de uma transação já em andamento.
 */
export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class StockRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Movimentações ───────────────────────────────────────────────────────────

  /**
   * Cria uma movimentação de estoque.
   * Se `idempotency_key` for fornecida e já existir, retorna o registro existente sem inserir novo.
   *
   * @param data.quantity positivo para entrada, negativo para saída — a conversão é de responsabilidade do chamador.
   */
  async createMovement(data: {
    unidade_id: string;
    product_id: string;
    lot_id: string;
    type: StockMovementType;
    quantity: Prisma.Decimal;
    reference_id?: string;
    reference_type?: string;
    idempotency_key?: string;
    notes?: string;
    created_by: string;
  }): Promise<StockMovement> {
    if (data.idempotency_key) {
      const existing = await this.prisma.stockMovement.findUnique({
        where: { idempotency_key: data.idempotency_key },
      });
      if (existing) return existing;
    }

    return this.prisma.stockMovement.create({ data });
  }

  // ─── Saldos ──────────────────────────────────────────────────────────────────

  /** Saldo consolidado de um produto (soma de todos os lotes) dentro da unidade. */
  async getProductBalance(productId: string, unitId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(quantity), 0)::text AS total
      FROM stock_movements
      WHERE product_id = ${productId}
        AND unidade_id = ${unitId}
    `;
    return parseFloat(result[0]?.total ?? '0');
  }

  /** Saldo de um lote específico dentro da unidade. */
  async getLotBalance(lotId: string, unitId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(quantity), 0)::text AS total
      FROM stock_movements
      WHERE lot_id    = ${lotId}
        AND unidade_id = ${unitId}
    `;
    return parseFloat(result[0]?.total ?? '0');
  }

  // ─── Listagens ───────────────────────────────────────────────────────────────

  /** Lista movimentações paginadas com filtros opcionais. */
  async findMovements(
    unitId: string,
    filters: {
      product_id?: string;
      lot_id?: string;
      type?: StockMovementType;
      date_from?: string;
      date_to?: string;
    },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.StockMovementWhereInput = { unidade_id: unitId };

    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.lot_id) where.lot_id = filters.lot_id;
    if (filters.type) where.type = filters.type;

    if (filters.date_from || filters.date_to) {
      where.created_at = {} as Prisma.DateTimeFilter;
      if (filters.date_from) {
        (where.created_at as Prisma.DateTimeFilter).gte = new Date(filters.date_from);
      }
      if (filters.date_to) {
        (where.created_at as Prisma.DateTimeFilter).lte = new Date(filters.date_to);
      }
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { created_at: 'desc' },
        include: {
          lot: { select: { code: true, expires_at: true } },
          product: { select: { name: true, sku: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  /**
   * Resumo de estoque por produto (saldo atual, contagem de lotes, indicador de estoque baixo).
   * Usa raw SQL para agregar movimentações de forma eficiente.
   */
  async getStockSummary(
    unitId: string,
    filters: { product_id?: string; category_id?: string },
    pagination: { page: number; limit: number },
  ) {
    type StockRow = {
      product_id: string;
      product_name: string;
      product_sku: string | null;
      min_stock: number;
      category_id: string | null;
      total_balance: string;
      lot_count: string;
    };

    const productFilter = filters.product_id
      ? Prisma.sql`AND sm.product_id = ${filters.product_id}`
      : Prisma.empty;

    const categoryFilter = filters.category_id
      ? Prisma.sql`AND p.category_id = ${filters.category_id}`
      : Prisma.empty;

    const offset = (pagination.page - 1) * pagination.limit;

    const rows = await this.prisma.$queryRaw<StockRow[]>`
      SELECT
        sm.product_id,
        p.name        AS product_name,
        p.sku         AS product_sku,
        p.min_stock,
        p.category_id,
        COALESCE(SUM(sm.quantity), 0)::text      AS total_balance,
        COUNT(DISTINCT sm.lot_id)::text          AS lot_count
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      WHERE sm.unidade_id = ${unitId}
        ${productFilter}
        ${categoryFilter}
      GROUP BY sm.product_id, p.name, p.sku, p.min_stock, p.category_id
      ORDER BY p.name ASC
      LIMIT ${pagination.limit} OFFSET ${offset}
    `;

    const countResult = await this.prisma.$queryRaw<[{ count: string }]>`
      SELECT COUNT(DISTINCT sm.product_id)::text AS count
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      WHERE sm.unidade_id = ${unitId}
        ${productFilter}
        ${categoryFilter}
    `;

    return {
      data: rows.map((r) => ({
        product_id: r.product_id,
        product_name: r.product_name,
        product_sku: r.product_sku,
        min_stock: Number(r.min_stock),
        category_id: r.category_id,
        total_balance: parseFloat(r.total_balance),
        lot_count: parseInt(r.lot_count, 10),
        is_low_stock: parseFloat(r.total_balance) < Number(r.min_stock),
      })),
      total: parseInt(countResult[0]?.count ?? '0', 10),
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  /**
   * Saldo por lote para um produto específico (inclui lotes com saldo zero para histórico completo).
   */
  async getLotBalancesByProduct(productId: string, unitId: string) {
    type LotBalanceRow = {
      lot_id: string;
      lot_code: string;
      expires_at: Date | null;
      active: boolean;
      balance: string;
    };

    const rows = await this.prisma.$queryRaw<LotBalanceRow[]>`
      SELECT
        l.id          AS lot_id,
        l.code        AS lot_code,
        l.expires_at,
        l.active,
        COALESCE(SUM(sm.quantity), 0)::text AS balance
      FROM lots l
      LEFT JOIN stock_movements sm
        ON sm.lot_id = l.id
        AND sm.unidade_id = ${unitId}
      WHERE l.product_id  = ${productId}
        AND l.unidade_id  = ${unitId}
      GROUP BY l.id, l.code, l.expires_at, l.active
      ORDER BY l.expires_at ASC NULLS LAST, l.created_at ASC
    `;

    return rows.map((r) => ({
      lot_id: r.lot_id,
      lot_code: r.lot_code,
      expires_at: r.expires_at,
      active: r.active,
      balance: parseFloat(r.balance),
    }));
  }

  // ─── Reserva FIFO ────────────────────────────────────────────────────────────

  /**
   * Reserva estoque em ordem FIFO dentro de uma transação EXISTENTE.
   *
   * Use este método quando o chamador já possui uma transação Prisma aberta e
   * precisa que a baixa de estoque faça parte do mesmo bloco atômico.
   * Toda a lógica de lock, idempotência e criação de movimentos roda com o `tx`
   * fornecido — nenhuma nova transação é criada.
   *
   * @param tx  Cliente de transação Prisma obtido dentro de um `$transaction`.
   * @param referenceId  ID do item/entidade que originou a baixa (ex: id do VendaItem).
   * @returns Array com os lotes alocados e as quantidades consumidas (sempre positivas).
   * @throws ConflictException se não houver lotes ativos ou estoque insuficiente.
   */
  async reserveFifoInTx(
    tx: PrismaTx,
    unitId: string,
    productId: string,
    quantity: number,
    idempotencyKey: string,
    referenceId: string | undefined,
    createdBy: string,
  ): Promise<Array<{ lot_id: string; quantity: number }>> {
    // 1. Verificar idempotência — se já existe, retornar o que foi reservado antes
    const existingMovements = await tx.stockMovement.findMany({
      where: {
        idempotency_key: { startsWith: `${idempotencyKey}_lot_` },
        type: StockMovementType.SALE_OUT,
      },
      select: { lot_id: true, quantity: true },
    });

    if (existingMovements.length > 0) {
      return existingMovements.map((m) => ({
        lot_id: m.lot_id,
        quantity: Math.abs(parseFloat(m.quantity.toString())),
      }));
    }

    // 2. Bloquear lotes ativos do produto em ordem FIFO com SELECT FOR UPDATE
    type LotRow = { id: string };
    const lots = await tx.$queryRaw<LotRow[]>`
      SELECT l.id
      FROM lots l
      WHERE l.unidade_id  = ${unitId}
        AND l.product_id  = ${productId}
        AND l.active      = true
      ORDER BY l.expires_at ASC NULLS LAST, l.created_at ASC
      FOR UPDATE
    `;

    if (lots.length === 0) {
      throw new ConflictException('Nenhum lote disponível para este produto');
    }

    // 3. Calcular saldo de cada lote DENTRO da transação (pós-lock) e alocar FIFO
    let remaining = quantity;
    const allocations: Array<{ lot_id: string; quantity: number }> = [];

    for (const lot of lots) {
      if (remaining <= 0) break;

      const balanceResult = await tx.$queryRaw<[{ balance: string }]>`
        SELECT COALESCE(SUM(quantity), 0)::text AS balance
        FROM stock_movements
        WHERE lot_id     = ${lot.id}
          AND unidade_id = ${unitId}
      `;
      const balance = parseFloat(balanceResult[0]?.balance ?? '0');

      if (balance <= 0) continue;

      const toConsume = Math.min(remaining, balance);
      allocations.push({ lot_id: lot.id, quantity: toConsume });
      remaining -= toConsume;
    }

    if (remaining > 0) {
      const available = quantity - remaining;
      throw new ConflictException(
        `Estoque insuficiente. Disponível: ${available}, necessário: ${quantity}`,
      );
    }

    // 4. Inserir StockMovements de saída (quantidade negativa = saída)
    for (const alloc of allocations) {
      const ikey = `${idempotencyKey}_lot_${alloc.lot_id}`;
      await tx.stockMovement.create({
        data: {
          unidade_id: unitId,
          product_id: productId,
          lot_id: alloc.lot_id,
          type: StockMovementType.SALE_OUT,
          quantity: new Prisma.Decimal(-alloc.quantity),
          reference_id: referenceId ?? null,
          reference_type: 'venda_item',
          idempotency_key: ikey,
          created_by: createdBy,
        },
      });
    }

    return allocations;
  }

  /**
   * Reserva estoque em ordem FIFO (validade mais próxima primeiro).
   *
   * Usa SELECT FOR UPDATE para prevenir overselling em cenários de alta concorrência.
   * É idempotente: uma segunda chamada com a mesma idempotency_key retorna a alocação original.
   *
   * Cria sua própria transação interna. Use `reserveFifoInTx` quando precisar
   * participar de uma transação externa (ex: checkout de venda).
   *
   * @returns Array com os lotes alocados e as quantidades consumidas (sempre positivas).
   * @throws ConflictException se não houver lotes ativos ou estoque insuficiente.
   */
  async reserveFifo(
    unitId: string,
    productId: string,
    quantity: number,
    idempotencyKey: string,
    referenceId: string | undefined,
    createdBy: string,
  ): Promise<Array<{ lot_id: string; quantity: number }>> {
    return this.prisma.$transaction(async (tx) => {
      return this.reserveFifoInTx(
        tx as unknown as PrismaTx,
        unitId,
        productId,
        quantity,
        idempotencyKey,
        referenceId,
        createdBy,
      );
    });
  }
}
