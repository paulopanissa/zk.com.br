import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface VendasTotaisRow {
  total_vendas: bigint;
  receita_bruta_centavos: bigint;
  total_descontos_centavos: bigint;
  receita_liquida_centavos: bigint;
}

export interface TopProdutoVendaRow {
  id: string;
  name: string;
  sku: string | null;
  unidades_vendidas: Prisma.Decimal;
  receita_centavos: bigint;
}

export interface PosicaoEstoqueRow {
  id: string;
  name: string;
  sku: string | null;
  saldo_atual: Prisma.Decimal;
}

export interface TotalEstoqueRow {
  total: bigint;
}

export interface LoteVencimentoRow {
  id: string;
  code: string;
  expires_at: Date;
  quantity_received: Prisma.Decimal;
  product_id: string;
  product_name: string;
  sku: string | null;
}

export interface CompradoresPeriodoRow {
  compradores_periodo: bigint;
}

export interface NovosClientesRow {
  novos: bigint;
}

export interface TopCompradorRow {
  id: string;
  nome: string;
  total_compras: bigint;
  total_gasto_centavos: bigint;
}

export interface TicketMedioClienteRow {
  ticket: Prisma.Decimal | null;
}

export interface ProdutoVolumeRow {
  id: string;
  name: string;
  sku: string | null;
  unidades_vendidas: Prisma.Decimal;
  receita_centavos: bigint;
  custo_centavos: number | null;
  preco_medio_centavos: Prisma.Decimal;
}

export interface VendasDiaRow {
  data: Date;
  total_centavos: bigint;
  total_pedidos: bigint;
}

export interface EstoqueCriticoCountRow {
  count: bigint;
}

export interface AlertaRecenteRow {
  id: string;
  type: string;
  message: string;
  created_at: Date;
}

@Injectable()
export class RelatoriosRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Vendas ───────────────────────────────────────────────────────────────────

  queryVendasTotais(
    unitId: string,
    inicio: Date,
    fim: Date,
    categoriaId?: string,
  ): Promise<VendasTotaisRow[]> {
    if (categoriaId) {
      return this.prisma.$queryRaw<VendasTotaisRow[]>`
        SELECT
          COUNT(DISTINCT v.id)::bigint                           AS total_vendas,
          COALESCE(SUM(vi.total_centavos), 0)::bigint            AS receita_liquida_centavos,
          COALESCE(SUM(vi.quantidade * vi.preco_unitario_centavos), 0)::bigint AS receita_bruta_centavos,
          COALESCE(SUM(vi.quantidade * vi.desconto_item_centavos), 0)::bigint  AS total_descontos_centavos
        FROM vendas v
        JOIN venda_items vi ON vi.venda_id = v.id
        JOIN products p     ON p.id = vi.product_id AND p.category_id = ${categoriaId}
        WHERE v.unidade_id = ${unitId}
          AND v.status     = 'FINALIZADA'
          AND v.created_at >= ${inicio}
          AND v.created_at <= ${fim}
      `;
    }
    return this.prisma.$queryRaw<VendasTotaisRow[]>`
      SELECT
        COUNT(DISTINCT v.id)::bigint                           AS total_vendas,
        COALESCE(SUM(vi.total_centavos), 0)::bigint            AS receita_liquida_centavos,
        COALESCE(SUM(vi.quantidade * vi.preco_unitario_centavos), 0)::bigint AS receita_bruta_centavos,
        COALESCE(SUM(vi.quantidade * vi.desconto_item_centavos), 0)::bigint  AS total_descontos_centavos
      FROM vendas v
      JOIN venda_items vi ON vi.venda_id = v.id
      WHERE v.unidade_id = ${unitId}
        AND v.status     = 'FINALIZADA'
        AND v.created_at >= ${inicio}
        AND v.created_at <= ${fim}
    `;
  }

  queryTopProdutosVendas(
    unitId: string,
    inicio: Date,
    fim: Date,
    limit: number,
  ): Promise<TopProdutoVendaRow[]> {
    return this.prisma.$queryRaw<TopProdutoVendaRow[]>`
      SELECT
        p.id,
        p.name,
        p.sku,
        SUM(vi.quantidade)             AS unidades_vendidas,
        SUM(vi.total_centavos)::bigint AS receita_centavos
      FROM venda_items vi
      JOIN products p ON p.id = vi.product_id
      JOIN vendas v   ON v.id = vi.venda_id
      WHERE v.unidade_id = ${unitId}
        AND v.status     = 'FINALIZADA'
        AND v.created_at >= ${inicio}
        AND v.created_at <= ${fim}
      GROUP BY p.id, p.name, p.sku
      ORDER BY receita_centavos DESC
      LIMIT ${limit}
    `;
  }

  // ── Estoque ──────────────────────────────────────────────────────────────────

  queryPosicaoEstoque(
    unitId: string,
    skip: number,
    take: number,
    categoriaId?: string,
  ): Promise<PosicaoEstoqueRow[]> {
    if (categoriaId) {
      return this.prisma.$queryRaw<PosicaoEstoqueRow[]>`
        SELECT
          p.id,
          p.name,
          p.sku,
          COALESCE(SUM(sm.quantity), 0) AS saldo_atual
        FROM products p
        LEFT JOIN stock_movements sm ON sm.product_id = p.id AND sm.unidade_id = ${unitId}
        WHERE p.unidade_id = ${unitId}
          AND p.active     = true
          AND p.category_id = ${categoriaId}
        GROUP BY p.id, p.name, p.sku
        ORDER BY saldo_atual ASC
        LIMIT ${take} OFFSET ${skip}
      `;
    }
    return this.prisma.$queryRaw<PosicaoEstoqueRow[]>`
      SELECT
        p.id,
        p.name,
        p.sku,
        COALESCE(SUM(sm.quantity), 0) AS saldo_atual
      FROM products p
      LEFT JOIN stock_movements sm ON sm.product_id = p.id AND sm.unidade_id = ${unitId}
      WHERE p.unidade_id = ${unitId}
        AND p.active     = true
      GROUP BY p.id, p.name, p.sku
      ORDER BY saldo_atual ASC
      LIMIT ${take} OFFSET ${skip}
    `;
  }

  queryTotalProdutosEstoque(unitId: string, categoriaId?: string): Promise<TotalEstoqueRow[]> {
    if (categoriaId) {
      return this.prisma.$queryRaw<TotalEstoqueRow[]>`
        SELECT COUNT(*)::bigint AS total
        FROM products
        WHERE unidade_id  = ${unitId}
          AND active       = true
          AND category_id = ${categoriaId}
      `;
    }
    return this.prisma.$queryRaw<TotalEstoqueRow[]>`
      SELECT COUNT(*)::bigint AS total
      FROM products
      WHERE unidade_id = ${unitId}
        AND active      = true
    `;
  }

  queryLotesProximosVencimento(
    unitId: string,
    thresholdDias: number,
  ): Promise<LoteVencimentoRow[]> {
    return this.prisma.$queryRaw<LoteVencimentoRow[]>`
      SELECT
        l.id,
        l.code,
        l.expires_at,
        l.quantity_received,
        p.id   AS product_id,
        p.name AS product_name,
        p.sku
      FROM lots l
      JOIN products p ON p.id = l.product_id
      JOIN (
        SELECT lot_id, SUM(quantity) AS saldo
        FROM stock_movements
        WHERE unidade_id = ${unitId}
        GROUP BY lot_id
      ) sm ON sm.lot_id = l.id AND sm.saldo > 0
      WHERE l.unidade_id  = ${unitId}
        AND l.expires_at IS NOT NULL
        AND l.expires_at <= NOW() + (${thresholdDias} * interval '1 day')
      ORDER BY l.expires_at ASC
      LIMIT 50
    `;
  }

  // ── Clientes ─────────────────────────────────────────────────────────────────

  queryCompradoresPeriodo(
    unitId: string,
    inicio: Date,
    fim: Date,
  ): Promise<CompradoresPeriodoRow[]> {
    return this.prisma.$queryRaw<CompradoresPeriodoRow[]>`
      SELECT COUNT(DISTINCT v.cliente_id)::bigint AS compradores_periodo
      FROM vendas v
      WHERE v.unidade_id = ${unitId}
        AND v.status     = 'FINALIZADA'
        AND v.created_at >= ${inicio}
        AND v.created_at <= ${fim}
        AND v.cliente_id IS NOT NULL
    `;
  }

  queryNovosClientes(unitId: string, inicio: Date, fim: Date): Promise<NovosClientesRow[]> {
    return this.prisma.$queryRaw<NovosClientesRow[]>`
      SELECT COUNT(*)::bigint AS novos
      FROM (
        SELECT v.cliente_id
        FROM vendas v
        WHERE v.unidade_id   = ${unitId}
          AND v.status       = 'FINALIZADA'
          AND v.cliente_id IS NOT NULL
        GROUP BY v.cliente_id
        HAVING MIN(v.created_at) BETWEEN ${inicio} AND ${fim}
      ) sub
    `;
  }

  queryTopCompradores(
    unitId: string,
    inicio: Date,
    fim: Date,
    top: number,
  ): Promise<TopCompradorRow[]> {
    return this.prisma.$queryRaw<TopCompradorRow[]>`
      SELECT
        c.id,
        c.nome,
        COUNT(v.id)::bigint                     AS total_compras,
        COALESCE(SUM(v.total_liquido_centavos), 0)::bigint AS total_gasto_centavos
      FROM vendas v
      JOIN customers c ON c.id = v.cliente_id
      WHERE v.unidade_id = ${unitId}
        AND v.status     = 'FINALIZADA'
        AND v.created_at >= ${inicio}
        AND v.created_at <= ${fim}
        AND v.cliente_id IS NOT NULL
      GROUP BY c.id, c.nome
      ORDER BY total_gasto_centavos DESC
      LIMIT ${top}
    `;
  }

  queryTicketMedioClientes(
    unitId: string,
    inicio: Date,
    fim: Date,
  ): Promise<TicketMedioClienteRow[]> {
    return this.prisma.$queryRaw<TicketMedioClienteRow[]>`
      SELECT AVG(v.total_liquido_centavos) AS ticket
      FROM vendas v
      WHERE v.unidade_id = ${unitId}
        AND v.status     = 'FINALIZADA'
        AND v.created_at >= ${inicio}
        AND v.created_at <= ${fim}
        AND v.cliente_id IS NOT NULL
    `;
  }

  // ── Produtos ranking ─────────────────────────────────────────────────────────

  queryProdutosPorMargem(
    unitId: string,
    inicio: Date,
    fim: Date,
    top: number,
    direction: 'DESC' | 'ASC',
  ): Promise<ProdutoVolumeRow[]> {
    if (direction === 'DESC') {
      return this.prisma.$queryRaw<ProdutoVolumeRow[]>`
        SELECT
          p.id, p.name, p.sku,
          SUM(vi.quantidade)                     AS unidades_vendidas,
          SUM(vi.total_centavos)::bigint          AS receita_centavos,
          pp.cost_price_cents                     AS custo_centavos,
          ROUND(AVG(vi.preco_unitario_centavos))  AS preco_medio_centavos
        FROM venda_items vi
        JOIN products p ON p.id = vi.product_id
        JOIN vendas v   ON v.id = vi.venda_id
        LEFT JOIN (
          SELECT product_id, MAX(cost_price_cents) AS cost_price_cents
          FROM product_pricing
          GROUP BY product_id
        ) pp ON pp.product_id = p.id
        WHERE v.unidade_id        = ${unitId}
          AND v.status            = 'FINALIZADA'
          AND v.created_at       >= ${inicio}
          AND v.created_at       <= ${fim}
          AND pp.cost_price_cents > 0
        GROUP BY p.id, p.name, p.sku, pp.cost_price_cents
        ORDER BY ROUND((AVG(vi.preco_unitario_centavos) - pp.cost_price_cents::numeric)
                       / NULLIF(AVG(vi.preco_unitario_centavos), 0) * 10000) DESC
        LIMIT ${top}
      `;
    }
    return this.prisma.$queryRaw<ProdutoVolumeRow[]>`
      SELECT
        p.id, p.name, p.sku,
        SUM(vi.quantidade)                     AS unidades_vendidas,
        SUM(vi.total_centavos)::bigint          AS receita_centavos,
        pp.cost_price_cents                     AS custo_centavos,
        ROUND(AVG(vi.preco_unitario_centavos))  AS preco_medio_centavos
      FROM venda_items vi
      JOIN products p ON p.id = vi.product_id
      JOIN vendas v   ON v.id = vi.venda_id
      LEFT JOIN (
        SELECT product_id, MAX(cost_price_cents) AS cost_price_cents
        FROM product_pricing
        GROUP BY product_id
      ) pp ON pp.product_id = p.id
      WHERE v.unidade_id        = ${unitId}
        AND v.status            = 'FINALIZADA'
        AND v.created_at       >= ${inicio}
        AND v.created_at       <= ${fim}
        AND pp.cost_price_cents > 0
      GROUP BY p.id, p.name, p.sku, pp.cost_price_cents
      ORDER BY ROUND((AVG(vi.preco_unitario_centavos) - pp.cost_price_cents::numeric)
                     / NULLIF(AVG(vi.preco_unitario_centavos), 0) * 10000) ASC
      LIMIT ${top}
    `;
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  queryVendasSerieDiaria(unitId: string, startDate: Date): Promise<VendasDiaRow[]> {
    return this.prisma.$queryRaw<VendasDiaRow[]>`
      SELECT
        d.day::date                                   AS data,
        COALESCE(SUM(vi.total_centavos), 0)::bigint   AS total_centavos,
        COUNT(DISTINCT v.id)::bigint                  AS total_pedidos
      FROM generate_series(${startDate}::date, CURRENT_DATE::date, '1 day'::interval) AS d(day)
      LEFT JOIN vendas v
        ON DATE(v.created_at) = d.day::date
        AND v.unidade_id = ${unitId}
        AND v.status = 'FINALIZADA'
      LEFT JOIN venda_items vi ON vi.venda_id = v.id
      GROUP BY d.day
      ORDER BY d.day ASC
    `;
  }

  queryEstoqueCriticoCount(unitId: string, threshold: number): Promise<EstoqueCriticoCountRow[]> {
    return this.prisma.$queryRaw<EstoqueCriticoCountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN stock_movements sm ON sm.product_id = p.id AND sm.unidade_id = ${unitId}
        WHERE p.unidade_id = ${unitId}
          AND p.active = true
        GROUP BY p.id
        HAVING COALESCE(SUM(sm.quantity), 0) > 0
          AND COALESCE(SUM(sm.quantity), 0) <= ${threshold}
      ) sub
    `;
  }

  queryAlertasRecentes(unitId: string, limit: number): Promise<AlertaRecenteRow[]> {
    return this.prisma.$queryRaw<AlertaRecenteRow[]>`
      SELECT id, type, message, created_at
      FROM alert_events
      WHERE unidade_id = ${unitId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  queryProdutosPorVolume(
    unitId: string,
    inicio: Date,
    fim: Date,
    top: number,
    direction: 'DESC' | 'ASC',
  ): Promise<ProdutoVolumeRow[]> {
    if (direction === 'DESC') {
      return this.prisma.$queryRaw<ProdutoVolumeRow[]>`
        SELECT
          p.id, p.name, p.sku,
          SUM(vi.quantidade)                     AS unidades_vendidas,
          SUM(vi.total_centavos)::bigint          AS receita_centavos,
          pp.cost_price_cents                     AS custo_centavos,
          ROUND(AVG(vi.preco_unitario_centavos))  AS preco_medio_centavos
        FROM venda_items vi
        JOIN products p ON p.id = vi.product_id
        JOIN vendas v   ON v.id = vi.venda_id
        LEFT JOIN (
          SELECT product_id, MAX(cost_price_cents) AS cost_price_cents
          FROM product_pricing
          GROUP BY product_id
        ) pp ON pp.product_id = p.id
        WHERE v.unidade_id  = ${unitId}
          AND v.status      = 'FINALIZADA'
          AND v.created_at >= ${inicio}
          AND v.created_at <= ${fim}
        GROUP BY p.id, p.name, p.sku, pp.cost_price_cents
        ORDER BY unidades_vendidas DESC
        LIMIT ${top}
      `;
    }
    return this.prisma.$queryRaw<ProdutoVolumeRow[]>`
      SELECT
        p.id, p.name, p.sku,
        SUM(vi.quantidade)                     AS unidades_vendidas,
        SUM(vi.total_centavos)::bigint          AS receita_centavos,
        pp.cost_price_cents                     AS custo_centavos,
        ROUND(AVG(vi.preco_unitario_centavos))  AS preco_medio_centavos
      FROM venda_items vi
      JOIN products p ON p.id = vi.product_id
      JOIN vendas v   ON v.id = vi.venda_id
      LEFT JOIN (
        SELECT product_id, MAX(cost_price_cents) AS cost_price_cents
        FROM product_pricing
        GROUP BY product_id
      ) pp ON pp.product_id = p.id
      WHERE v.unidade_id  = ${unitId}
        AND v.status      = 'FINALIZADA'
        AND v.created_at >= ${inicio}
        AND v.created_at <= ${fim}
      GROUP BY p.id, p.name, p.sku, pp.cost_price_cents
      ORDER BY unidades_vendidas ASC
      LIMIT ${top}
    `;
  }
}
