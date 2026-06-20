import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { QueryClientesDto } from './dto/query-clientes.dto';
import { QueryEstoqueDto } from './dto/query-estoque.dto';
import { QueryProdutosDto } from './dto/query-produtos.dto';
import { QueryVendasDto } from './dto/query-vendas.dto';
import {
  RelatoriosRepository,
  ProdutoVolumeRow,
  VendasDiaRow,
} from './relatorios.repository';

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export interface TopProdutoVenda {
  id: string;
  name: string;
  sku: string | null;
  unidades_vendidas: number;
  receita_centavos: number;
}

export interface RelatorioVendasResult {
  periodo: { inicio: Date; fim: Date };
  total_vendas: number;
  receita_bruta_centavos: number;
  total_descontos_centavos: number;
  receita_liquida_centavos: number;
  ticket_medio_centavos: number;
  top_produtos: TopProdutoVenda[];
}

export interface PosicaoEstoqueItem {
  id: string;
  name: string;
  sku: string | null;
  saldo_atual: number;
}

export interface LoteProximoVencimento {
  id: string;
  code: string;
  expires_at: Date;
  quantity_received: number;
  product_id: string;
  product_name: string;
  sku: string | null;
}

export interface RelatorioEstoqueResult {
  posicao: {
    data: PosicaoEstoqueItem[];
    total: number;
    page: number;
    limit: number;
  };
  lotes_proximos_vencimento: LoteProximoVencimento[];
}

export interface TopComprador {
  id: string;
  nome: string;
  total_compras: number;
  total_gasto_centavos: number;
}

export interface RelatorioClientesResult {
  periodo: { inicio: Date; fim: Date };
  compradores_periodo: number;
  novos_clientes: number;
  clientes_recorrentes: number;
  ticket_medio_centavos: number;
  top_compradores: TopComprador[];
}

export interface ProdutoRanking {
  id: string;
  name: string;
  sku: string | null;
  unidades_vendidas: number;
  receita_centavos: number;
  margem_bps: number | null;
}

export interface RelatorioProdutosResult {
  periodo: { inicio: Date; fim: Date };
  ordem: 'margem' | 'volume';
  melhores: ProdutoRanking[];
  piores: ProdutoRanking[];
}

export interface DashboardKpi {
  total_centavos: number;
  total_pedidos: number;
  ticket_medio_centavos: number;
}

export interface DashboardSerieDia {
  data: string;
  total_centavos: number;
  total_pedidos: number;
}

export interface DashboardTopProduto {
  id: string;
  name: string;
  sku: string | null;
  unidades_vendidas: number;
  receita_centavos: number;
}

export interface DashboardAlerta {
  id: string;
  tipo: string;
  mensagem: string;
  criado_em: string;
}

export interface DashboardResult {
  hoje: DashboardKpi;
  ontem: DashboardKpi;
  serie_7_dias: DashboardSerieDia[];
  top_produtos: DashboardTopProduto[];
  estoque_critico_count: number;
  alertas: DashboardAlerta[];
}

// ─── Raw query row types ──────────────────────────────────────────────────────

interface VendasTotalizadoresRow {
  total_vendas: bigint;
  receita_bruta_centavos: bigint;
  total_descontos_centavos: bigint;
  receita_liquida_centavos: bigint;
}

interface TopProdutoRow {
  id: string;
  name: string;
  sku: string | null;
  unidades_vendidas: Prisma.Decimal;
  receita_centavos: bigint;
}

interface PosicaoEstoqueRow {
  id: string;
  name: string;
  sku: string | null;
  saldo_atual: Prisma.Decimal;
}

interface CountRow {
  count: bigint;
}

interface LoteVencimentoRow {
  id: string;
  code: string;
  expires_at: Date;
  quantity_received: Prisma.Decimal;
  product_id: string;
  product_name: string;
  sku: string | null;
}

interface CompradorPeriodoRow {
  compradores_periodo: bigint;
}

interface NovosClientesRow {
  novos: bigint;
}

interface TopCompradorRow {
  id: string;
  nome: string;
  total_compras: bigint;
  total_gasto_centavos: bigint;
}

interface TicketMedioClienteRow {
  ticket: Prisma.Decimal | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RelatoriosService {
  constructor(
    private readonly repository: RelatoriosRepository,
    private readonly tenancy: TenancyService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private resolvePeriodo(
    data_inicio?: string,
    data_fim?: string,
  ): { inicio: Date; fim: Date } {
    const fim = data_fim ? new Date(data_fim) : new Date();
    const inicio = data_inicio
      ? new Date(data_inicio)
      : new Date(fim.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (inicio > fim) {
      throw new BadRequestException('data_inicio deve ser anterior a data_fim');
    }
    return { inicio, fim };
  }

  private toBigIntNumber(val: bigint | number | string): number {
    return Number(val);
  }

  private toInt(val: Prisma.Decimal | number | string | null | undefined): number {
    return Math.round(Number(val ?? 0));
  }

  // ── Relatório de Vendas ───────────────────────────────────────────────────

  async getVendas(
    dto: QueryVendasDto,
    user: JwtSystemPayload,
  ): Promise<RelatorioVendasResult> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { inicio, fim } = this.resolvePeriodo(dto.data_inicio, dto.data_fim);
    const topLimit = dto.limit ?? 10;

    const [totalizadores, topProdutosRows] = await Promise.all([
      this.repository.queryVendasTotais(unitId, inicio, fim, dto.categoria_id),
      this.repository.queryTopProdutosVendas(unitId, inicio, fim, topLimit),
    ]);

    const t = totalizadores[0];
    const totalVendas = this.toBigIntNumber(t.total_vendas);
    const receitaBruta = this.toBigIntNumber(t.receita_bruta_centavos);
    const totalDescontos = this.toBigIntNumber(t.total_descontos_centavos);
    const receitaLiquida = this.toBigIntNumber(t.receita_liquida_centavos);
    const ticketMedio = totalVendas > 0 ? Math.round(receitaLiquida / totalVendas) : 0;

    return {
      periodo: { inicio, fim },
      total_vendas: totalVendas,
      receita_bruta_centavos: receitaBruta,
      total_descontos_centavos: totalDescontos,
      receita_liquida_centavos: receitaLiquida,
      ticket_medio_centavos: ticketMedio,
      top_produtos: topProdutosRows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        unidades_vendidas: this.toInt(r.unidades_vendidas),
        receita_centavos: this.toBigIntNumber(r.receita_centavos),
      })),
    };
  }

  // ── Relatório de Estoque ──────────────────────────────────────────────────

  async getEstoque(
    dto: QueryEstoqueDto,
    user: JwtSystemPayload,
  ): Promise<RelatorioEstoqueResult> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    const thresholdDias = dto.threshold_dias ?? 30;

    const [posicaoRows, countRows, loteRows] = await Promise.all([
      this.repository.queryPosicaoEstoque(unitId, skip, limit, dto.categoria_id),
      this.repository.queryTotalProdutosEstoque(unitId, dto.categoria_id),
      this.repository.queryLotesProximosVencimento(unitId, thresholdDias),
    ]);

    const total = this.toBigIntNumber(countRows[0].total);

    return {
      posicao: {
        data: posicaoRows.map((r) => ({
          id: r.id,
          name: r.name,
          sku: r.sku,
          saldo_atual: this.toInt(r.saldo_atual),
        })),
        total,
        page,
        limit,
      },
      lotes_proximos_vencimento: loteRows.map((r) => ({
        id: r.id,
        code: r.code,
        expires_at: r.expires_at,
        quantity_received: this.toInt(r.quantity_received),
        product_id: r.product_id,
        product_name: r.product_name,
        sku: r.sku,
      })),
    };
  }

  // ── Relatório de Clientes ─────────────────────────────────────────────────

  async getClientes(
    dto: QueryClientesDto,
    user: JwtSystemPayload,
  ): Promise<RelatorioClientesResult> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { inicio, fim } = this.resolvePeriodo(dto.data_inicio, dto.data_fim);
    const top = dto.top ?? 10;

    const [compradorRows, novosRows, ticketRows, topRows] = await Promise.all([
      this.repository.queryCompradoresPeriodo(unitId, inicio, fim),
      this.repository.queryNovosClientes(unitId, inicio, fim),
      this.repository.queryTicketMedioClientes(unitId, inicio, fim),
      this.repository.queryTopCompradores(unitId, inicio, fim, top),
    ]);

    const compradorPeriodo = this.toBigIntNumber(compradorRows[0].compradores_periodo);
    const novosClientes = this.toBigIntNumber(novosRows[0].novos);
    const recorrentes = Math.max(0, compradorPeriodo - novosClientes);
    const ticketMedio = ticketRows[0].ticket != null ? this.toInt(ticketRows[0].ticket) : 0;

    return {
      periodo: { inicio, fim },
      compradores_periodo: compradorPeriodo,
      novos_clientes: novosClientes,
      clientes_recorrentes: recorrentes,
      ticket_medio_centavos: ticketMedio,
      top_compradores: topRows.map((r) => ({
        id: r.id,
        nome: r.nome,
        total_compras: this.toBigIntNumber(r.total_compras),
        total_gasto_centavos: this.toBigIntNumber(r.total_gasto_centavos),
      })),
    };
  }

  // ── Relatório de Produtos ─────────────────────────────────────────────────

  async getProdutos(
    dto: QueryProdutosDto,
    user: JwtSystemPayload,
  ): Promise<RelatorioProdutosResult> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { inicio, fim } = this.resolvePeriodo(dto.data_inicio, dto.data_fim);
    const ordem = dto.ordem ?? 'volume';
    const top = dto.top ?? 10;

    // Para cálculo de margem, fazemos JOIN com product_pricing
    // margem_bps = ROUND((preco_venda - custo) / preco_venda * 10000)
    // preco_venda = AVG(vi.preco_unitario_centavos), custo = pp.cost_price_cents

    let melhoresRows: ProdutoVolumeRow[];
    let pioresRows: ProdutoVolumeRow[];

    if (ordem === 'margem') {
      [melhoresRows, pioresRows] = await Promise.all([
        this.repository.queryProdutosPorMargem(unitId, inicio, fim, top, 'DESC'),
        this.repository.queryProdutosPorMargem(unitId, inicio, fim, top, 'ASC'),
      ]);
    } else {
      [melhoresRows, pioresRows] = await Promise.all([
        this.repository.queryProdutosPorVolume(unitId, inicio, fim, top, 'DESC'),
        this.repository.queryProdutosPorVolume(unitId, inicio, fim, top, 'ASC'),
      ]);
    }

    const mapProduto = (r: ProdutoVolumeRow): ProdutoRanking => {
      const custo = r.custo_centavos ?? 0;
      const precoMedio = Math.round(this.toInt(r.preco_medio_centavos));
      const margemBps =
        custo > 0 && precoMedio > 0
          ? Math.round(((precoMedio - custo) / precoMedio) * 10000)
          : null;

      return {
        id: r.id,
        name: r.name,
        sku: r.sku,
        unidades_vendidas: Math.round(this.toInt(r.unidades_vendidas)),
        receita_centavos: this.toBigIntNumber(r.receita_centavos),
        margem_bps: margemBps,
      };
    };

    return {
      periodo: { inicio, fim },
      ordem,
      melhores: melhoresRows.map(mapProduto),
      piores: pioresRows.map(mapProduto),
    };
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  async getDashboard(user: JwtSystemPayload): Promise<DashboardResult> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const hojeInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const hojeFim = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [serie, topProdutos, estoqueCriticoRows, alertasRows] = await Promise.all([
      this.repository.queryVendasSerieDiaria(unitId, startDate),
      this.repository.queryTopProdutosVendas(unitId, hojeInicio, hojeFim, 5),
      this.repository.queryEstoqueCriticoCount(unitId, 5),
      this.repository.queryAlertasRecentes(unitId, 5),
    ]);

    const makeKpi = (row: VendasDiaRow | null | undefined): DashboardKpi => {
      const total = row ? this.toBigIntNumber(row.total_centavos) : 0;
      const pedidos = row ? this.toBigIntNumber(row.total_pedidos) : 0;
      return {
        total_centavos: total,
        total_pedidos: pedidos,
        ticket_medio_centavos: pedidos > 0 ? Math.round(total / pedidos) : 0,
      };
    };

    const toIsoDate = (val: Date | unknown): string => {
      const d = val instanceof Date ? val : new Date(String(val));
      return d.toISOString().split('T')[0];
    };

    return {
      hoje: makeKpi(serie[serie.length - 1]),
      ontem: makeKpi(serie[serie.length - 2]),
      serie_7_dias: serie.map((r) => ({
        data: toIsoDate(r.data),
        total_centavos: this.toBigIntNumber(r.total_centavos),
        total_pedidos: this.toBigIntNumber(r.total_pedidos),
      })),
      top_produtos: topProdutos.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        unidades_vendidas: this.toInt(r.unidades_vendidas),
        receita_centavos: this.toBigIntNumber(r.receita_centavos),
      })),
      estoque_critico_count: this.toBigIntNumber(
        estoqueCriticoRows[0]?.count ?? BigInt(0),
      ),
      alertas: alertasRows.map((r) => ({
        id: r.id,
        tipo: r.type,
        mensagem: r.message,
        criado_em: r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
      })),
    };
  }
}
