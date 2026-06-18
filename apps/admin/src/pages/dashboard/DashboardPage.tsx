import { ShoppingCart, Package, TrendingUp, AlertTriangle } from 'lucide-react'
import { KpiCard } from './components/KpiCard'
import { VendasChart } from './components/VendasChart'
import { TopProdutos } from './components/TopProdutos'
import { AlertasRecentes } from './components/AlertasRecentes'
import { StatusCaixa } from './components/StatusCaixa'
import {
  HOJE,
  ONTEM,
  VENDAS_7_DIAS,
  TOP_PRODUTOS,
  ALERTAS_RECENTES,
  STATUS_CAIXA,
  ESTOQUE_CRITICO_COUNT,
} from '@/data/dashboard.mock'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

function variacao(atual: number, anterior: number) {
  if (anterior === 0) return 0
  return ((atual - anterior) / anterior) * 100
}

export function DashboardPage() {
  const varVendas = variacao(HOJE.total, ONTEM.total)
  const varPedidos = variacao(HOJE.pedidos, ONTEM.pedidos)
  const ticketHoje = HOJE.pedidos > 0 ? HOJE.total / HOJE.pedidos : 0
  const ticketOntem = ONTEM.pedidos > 0 ? ONTEM.total / ONTEM.pedidos : 0
  const varTicket = variacao(ticketHoje, ticketOntem)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quarta-feira, 17 de junho de 2026 — Loja Central
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Vendas hoje"
          value={formatBRL(HOJE.total)}
          variacao={varVendas}
          icon={TrendingUp}
          destaque
        />
        <KpiCard
          label="Pedidos hoje"
          value={String(HOJE.pedidos)}
          variacao={varPedidos}
          icon={ShoppingCart}
        />
        <KpiCard
          label="Ticket médio"
          value={formatBRL(ticketHoje)}
          variacao={varTicket}
          icon={TrendingUp}
        />
        <KpiCard
          label="Estoque crítico"
          value={`${ESTOQUE_CRITICO_COUNT} itens`}
          icon={AlertTriangle}
          alerta={ESTOQUE_CRITICO_COUNT > 0}
        />
      </div>

      {/* Gráfico + Status Caixa */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VendasChart dados={VENDAS_7_DIAS} />
        </div>
        <StatusCaixa status={STATUS_CAIXA} />
      </div>

      {/* Top produtos + Alertas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopProdutos produtos={TOP_PRODUTOS} />
        <AlertasRecentes alertas={ALERTAS_RECENTES} />
      </div>
    </div>
  )
}
