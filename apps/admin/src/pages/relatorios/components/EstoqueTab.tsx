import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PosicaoItem {
  id: string
  name: string
  sku: string | null
  saldo_atual: number
}

interface LoteVencendo {
  id: string
  code: string
  expires_at: string
  quantity_received: number
  product_id: string
  product_name: string
  sku: string | null
}

interface EstoqueData {
  posicao: {
    data: PosicaoItem[]
    total: number
    page: number
    limit: number
  }
  lotes_proximos_vencimento: LoteVencendo[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('pt-BR')
}

function diasAteVencer(iso: string): number {
  const exp = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─── Component ────────────────────────────────────────────────────────────────

const LIMIT = 20

export function EstoqueTab() {
  const [threshold, setThreshold] = useState('30')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<EstoqueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<EstoqueData>('/relatorios/estoque', {
        params: { threshold_dias: threshold, page, limit: LIMIT },
      })
      .then((r) => setData(r.data))
      .catch(() => setError('Não foi possível carregar o relatório de estoque.'))
      .finally(() => setLoading(false))
  }, [threshold, page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = data ? Math.max(1, Math.ceil(data.posicao.total / LIMIT)) : 1

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-foreground">Lotes vencendo em:</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={365}
            value={threshold}
            onChange={(e) => { setThreshold(e.target.value); setPage(1) }}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">dias</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={loading}>
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
          {/* Lotes próximos ao vencimento */}
          {data.lotes_proximos_vencimento.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/8 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-warning/20 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-semibold text-warning">
                  Lotes Próximos ao Vencimento ({data.lotes_proximos_vencimento.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-warning/20 bg-warning/5">
                      <th className="px-5 py-3 text-left font-semibold text-foreground">Produto</th>
                      <th className="px-5 py-3 text-left font-semibold text-foreground">Lote</th>
                      <th className="px-5 py-3 text-left font-semibold text-foreground">Vencimento</th>
                      <th className="px-5 py-3 text-right font-semibold text-foreground">Qtd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lotes_proximos_vencimento.map((l) => {
                      const dias = diasAteVencer(l.expires_at)
                      const vencido = dias < 0
                      return (
                        <tr
                          key={l.id}
                          className="border-b border-warning/10 last:border-0 hover:bg-warning/10 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-foreground leading-snug">{l.product_name}</p>
                            {l.sku && <p className="text-xs font-mono text-muted-foreground">{l.sku}</p>}
                          </td>
                          <td className="px-5 py-3 font-mono text-sm text-foreground">{l.code}</td>
                          <td className="px-5 py-3">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                vencido ? 'text-destructive' : 'text-warning',
                              )}
                            >
                              {fmtDate(l.expires_at)}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {vencido ? `há ${Math.abs(dias)} dias` : `em ${dias} dias`}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-foreground">
                            {l.quantity_received.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Posição de estoque */}
          <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Posição de Estoque — {data.posicao.total} produto{data.posicao.total !== 1 ? 's' : ''}
              </h2>
              <span className="text-xs text-muted-foreground">menor saldo primeiro</span>
            </div>
            {data.posicao.data.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum produto ativo encontrado.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-3 text-left font-semibold text-foreground">Produto</th>
                        <th className="px-5 py-3 text-right font-semibold text-foreground">Saldo Atual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.posicao.data.map((p, i) => (
                        <tr
                          key={p.id}
                          className={cn(
                            'border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                            i % 2 === 1 && 'bg-muted/10',
                            p.saldo_atual <= 0 && 'opacity-60',
                          )}
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-foreground leading-snug">{p.name}</p>
                            {p.sku && <p className="text-xs font-mono text-muted-foreground">{p.sku}</p>}
                          </td>
                          <td
                            className={cn(
                              'px-5 py-3 text-right tabular-nums font-semibold',
                              p.saldo_atual <= 0 ? 'text-destructive' : 'text-foreground',
                            )}
                          >
                            {p.saldo_atual.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-5 py-3">
                    <span className="text-xs text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
