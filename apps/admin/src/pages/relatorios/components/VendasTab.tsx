import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendasData {
  total_vendas: number
  receita_bruta_centavos: number
  total_descontos_centavos: number
  receita_liquida_centavos: number
  ticket_medio_centavos: number
  top_produtos: Array<{
    id: string
    name: string
    sku: string | null
    unidades_vendidas: number
    receita_centavos: number
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBrl(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VendasTab() {
  const dates = defaultDates()
  const [inicio, setInicio] = useState(dates.inicio)
  const [fim, setFim] = useState(dates.fim)
  const [data, setData] = useState<VendasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<VendasData>('/relatorios/vendas', { params: { data_inicio: inicio, data_fim: fim } })
      .then((r) => setData(r.data))
      .catch(() => setError('Não foi possível carregar o relatório de vendas.'))
      .finally(() => setLoading(false))
  }, [inicio, fim])

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
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total de Vendas" value={data.total_vendas.toLocaleString('pt-BR')} />
            <KpiCard label="Receita Bruta" value={fmtBrl(data.receita_bruta_centavos)} />
            <KpiCard label="Descontos Dados" value={fmtBrl(data.total_descontos_centavos)} />
            <KpiCard label="Ticket Médio" value={fmtBrl(data.ticket_medio_centavos)} />
          </div>

          <div className="rounded-lg border border-success/30 bg-success/8 px-5 py-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-success">Receita Líquida (período)</p>
            <p className="font-display text-2xl font-bold text-success tabular-nums">
              {fmtBrl(data.receita_liquida_centavos)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Top Produtos por Receita</h2>
            </div>
            {data.top_produtos.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma venda registrada no período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left font-semibold text-foreground">Produto</th>
                      <th className="px-5 py-3 text-right font-semibold text-foreground">Unidades</th>
                      <th className="px-5 py-3 text-right font-semibold text-foreground">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_produtos.map((p, i) => (
                      <tr
                        key={p.id}
                        className={cn(
                          'border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                          i % 2 === 1 && 'bg-muted/10',
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
