import { useCallback, useEffect, useState } from 'react'
import { ShoppingCart, Package, TrendingUp, AlertTriangle } from 'lucide-react'
import { KpiCard } from './components/KpiCard'
import { VendasChart } from './components/VendasChart'
import { TopProdutos } from './components/TopProdutos'
import { AlertasRecentes } from './components/AlertasRecentes'
import { StatusCaixa } from './components/StatusCaixa'
import { api } from '@/lib/api'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DashboardKpi {
  total_centavos: number
  total_pedidos: number
  ticket_medio_centavos: number
}

export interface DashboardData {
  hoje: DashboardKpi
  ontem: DashboardKpi
  serie_7_dias: Array<{ data: string; total_centavos: number; total_pedidos: number }>
  top_produtos: Array<{
    id: string
    name: string
    sku: string | null
    unidades_vendidas: number
    receita_centavos: number
  }>
  estoque_critico_count: number
  alertas: Array<{ id: string; tipo: string; mensagem: string; criado_em: string }>
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

function variacao(atual: number, anterior: number) {
  if (anterior === 0) return 0
  return ((atual - anterior) / anterior) * 100
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-9 w-40 rounded-lg bg-muted" />
      <div className="h-4 w-64 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 h-56" />
        <div className="rounded-xl border bg-card p-5 h-56" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 h-48" />
        <div className="rounded-xl border bg-card p-5 h-48" />
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<DashboardData>('/relatorios/dashboard')
      setData(res.data)
    } catch {
      setError('Não foi possível carregar os dados do dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {error ?? 'Erro desconhecido.'}
          <button
            type="button"
            onClick={fetchDashboard}
            className="ml-3 underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const varVendas = variacao(data.hoje.total_centavos, data.ontem.total_centavos)
  const varPedidos = variacao(data.hoje.total_pedidos, data.ontem.total_pedidos)
  const varTicket = variacao(data.hoje.ticket_medio_centavos, data.ontem.ticket_medio_centavos)

  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{dataHoje}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Vendas hoje"
          value={formatBRL(data.hoje.total_centavos)}
          variacao={varVendas}
          icon={TrendingUp}
          destaque
        />
        <KpiCard
          label="Pedidos hoje"
          value={String(data.hoje.total_pedidos)}
          variacao={varPedidos}
          icon={ShoppingCart}
        />
        <KpiCard
          label="Ticket médio"
          value={formatBRL(data.hoje.ticket_medio_centavos)}
          variacao={varTicket}
          icon={TrendingUp}
        />
        <KpiCard
          label="Estoque crítico"
          value={`${data.estoque_critico_count} itens`}
          icon={AlertTriangle}
          alerta={data.estoque_critico_count > 0}
        />
      </div>

      {/* Gráfico + Resumo do dia */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VendasChart dados={data.serie_7_dias} />
        </div>
        <StatusCaixa hoje={data.hoje} />
      </div>

      {/* Top produtos + Alertas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopProdutos produtos={data.top_produtos} />
        <AlertasRecentes alertas={data.alertas} />
      </div>
    </div>
  )
}
