import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

type Ordem = 'volume' | 'margem'

interface ProdutoRanking {
  id: string
  name: string
  sku: string | null
  unidades_vendidas: number
  receita_centavos: number
  margem_bps: number | null
}

interface ProdutosData {
  ordem: Ordem
  melhores: ProdutoRanking[]
  piores: ProdutoRanking[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBrl(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtMargem(bps: number | null): string {
  if (bps === null) return '—'
  return (bps / 100).toFixed(1) + '%'
}

function margemClass(bps: number | null): string {
  if (bps === null) return 'text-muted-foreground'
  if (bps < 0) return 'text-destructive'
  if (bps < 1000) return 'text-warning'
  return 'text-success'
}

function defaultDates() {
  const fim = new Date()
  const inicio = new Date(fim.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RankingTable({
  title,
  produtos,
  rowClass,
}: {
  title: string
  produtos: ProdutoRanking[]
  rowClass?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {produtos.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhum dado disponível no período.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left font-semibold text-foreground">Produto</th>
                <th className="px-5 py-3 text-right font-semibold text-foreground">Unidades</th>
                <th className="px-5 py-3 text-right font-semibold text-foreground">Receita</th>
                <th className="px-5 py-3 text-right font-semibold text-foreground">Margem</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => (
                <tr
                  key={p.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                    i % 2 === 1 && 'bg-muted/10',
                    rowClass,
                  )}
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground leading-snug">{p.name}</p>
                    {p.sku && <p className="text-xs font-mono text-muted-foreground">{p.sku}</p>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-foreground">
                    {p.unidades_vendidas.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">
                    {fmtBrl(p.receita_centavos)}
                  </td>
                  <td className={cn('px-5 py-3 text-right tabular-nums font-semibold', margemClass(p.margem_bps))}>
                    {fmtMargem(p.margem_bps)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProdutosTab() {
  const dates = defaultDates()
  const [inicio, setInicio] = useState(dates.inicio)
  const [fim, setFim] = useState(dates.fim)
  const [ordem, setOrdem] = useState<Ordem>('volume')
  const [data, setData] = useState<ProdutosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<ProdutosData>('/relatorios/produtos', {
        params: { data_inicio: inicio, data_fim: fim, ordem },
      })
      .then((r) => setData(r.data))
      .catch(() => setError('Não foi possível carregar o relatório de produtos.'))
      .finally(() => setLoading(false))
  }, [inicio, fim, ordem])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-foreground">Período:</span>
        <div className="flex items-center gap-2">
          <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-40" />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="w-40" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Ordenar por:</span>
          {(['volume', 'margem'] as Ordem[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrdem(o)}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                ordem === o
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
              )}
            >
              {o === 'volume' ? 'Volume' : 'Margem'}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          Aplicar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-border bg-card py-16 text-center text-sm text-muted-foreground shadow-sm">
          Carregando relatório…
        </div>
      )}

      {!loading && !error && data && (
        <div className="grid lg:grid-cols-2 gap-5">
          <RankingTable
            title={ordem === 'volume' ? 'Mais Vendidos (volume)' : 'Maior Margem'}
            produtos={data.melhores}
          />
          <RankingTable
            title={ordem === 'volume' ? 'Menos Vendidos (volume)' : 'Menor Margem'}
            produtos={data.piores}
          />
        </div>
      )}
    </div>
  )
}
