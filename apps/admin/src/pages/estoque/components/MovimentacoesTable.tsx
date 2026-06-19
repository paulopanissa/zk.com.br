import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { type StockMovement, type StockMovementType, formatMovimentacaoTipo, isEntrada } from '../types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TYPE_COLOR: Record<StockMovementType, string> = {
  PURCHASE_ENTRY:  'border-success/40 bg-success/10 text-success',
  SALE_RETURN:     'border-success/40 bg-success/10 text-success',
  MANUAL_ENTRY:    'border-success/40 bg-success/10 text-success',
  TRANSFER_IN:     'border-success/40 bg-success/10 text-success',
  SALE_OUT:        'border-primary/40 bg-primary/10 text-primary',
  MANUAL_EXIT:     'border-warning/40 bg-warning/10 text-warning',
  TRANSFER_OUT:    'border-muted bg-muted/30 text-muted-foreground',
  PURCHASE_CANCEL: 'border-destructive/40 bg-destructive/10 text-destructive',
}

interface MovimentacoesTableProps {
  movimentacoes: StockMovement[]
  loading: boolean
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function MovimentacoesTable({ movimentacoes, loading, page, limit, total, onPageChange }: MovimentacoesTableProps) {
  const totalPages = Math.ceil(total / limit)

  if (loading && movimentacoes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {[100, 130, 180, 80, 60, 80].map((w, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-4 bg-muted/60 rounded animate-pulse" style={{ width: w }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (movimentacoes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm py-16 text-center">
        <p className="font-display text-lg font-bold text-foreground">Nenhuma movimentação encontrada</p>
        <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Data', 'Tipo', 'Produto', 'Lote', 'Quantidade', 'Referência'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left',
                    h === 'Quantidade' && 'text-right',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((m, i) => {
              const entrada = isEntrada(m.type)
              const qty = parseFloat(m.quantity)

              return (
                <tr
                  key={m.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/20',
                    i % 2 === 1 && 'bg-muted/10',
                  )}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(m.created_at)}
                  </td>

                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn('text-xs whitespace-nowrap', TYPE_COLOR[m.type])}>
                      {formatMovimentacaoTipo(m.type)}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-tight max-w-[180px] truncate">{m.product.name}</p>
                    {m.product.sku && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{m.product.sku}</p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">{m.lot.code}</span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className={cn('inline-flex items-center gap-1 tabular-nums font-semibold', entrada ? 'text-success' : 'text-destructive')}>
                      {entrada ? (
                        <ArrowDownCircle className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                      )}
                      {entrada ? '+' : '-'}{Math.abs(qty).toLocaleString('pt-BR')}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">
                    {m.reference_id ? (
                      <span className="font-mono">{m.reference_id.slice(0, 8)}…</span>
                    ) : m.notes ? (
                      <span className="italic">{m.notes}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {total} movimentaç{total !== 1 ? 'ões' : 'ão'}
          {totalPages > 1 && ` · página ${page} de ${totalPages}`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
