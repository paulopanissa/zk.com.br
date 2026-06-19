import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { type StockSummaryItem } from '../types'

interface EstoqueTableProps {
  items: StockSummaryItem[]
  loading: boolean
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function EstoqueTable({ items, loading, page, limit, total, onPageChange }: EstoqueTableProps) {
  const totalPages = Math.ceil(total / limit)

  if (loading && items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {[220, 80, 80, 60, 70].map((w, j) => (
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

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm py-16 text-center">
        <p className="font-display text-lg font-bold text-foreground">Nenhum produto com estoque</p>
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
              {[
                { key: 'produto',  label: 'Produto' },
                { key: 'saldo',    label: 'Saldo total' },
                { key: 'lotes',    label: 'Lotes' },
                { key: 'minimo',   label: 'Mínimo' },
                { key: 'status',   label: 'Status' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left',
                    (key === 'saldo' || key === 'lotes' || key === 'minimo') && 'text-right',
                    key === 'status' && 'text-center',
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={item.product_id}
                className={cn(
                  'border-b border-border/50 transition-colors hover:bg-muted/20',
                  i % 2 === 1 && 'bg-muted/10',
                  item.is_low_stock && 'bg-warning/5',
                )}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground leading-tight">{item.product_name}</p>
                  {item.product_sku && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{item.product_sku}</p>
                  )}
                </td>

                <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                  {item.total_balance.toLocaleString('pt-BR')}
                </td>

                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {item.lot_count}
                </td>

                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {item.min_stock.toLocaleString('pt-BR')}
                </td>

                <td className="px-4 py-3 text-center">
                  {item.is_low_stock ? (
                    <Badge variant="outline" className="text-xs border-warning/40 bg-warning/10 text-warning">
                      Baixo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-success/40 bg-success/10 text-success">
                      Normal
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {total} produto{total !== 1 ? 's' : ''}
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
