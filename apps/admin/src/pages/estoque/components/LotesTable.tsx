import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { type LoteMock, getLoteStatus, type LoteStatus } from '@/data/estoque.mock'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  // Append time to avoid UTC midnight → local day shift in UTC-3
  const normalized = iso.includes('T') ? iso : `${iso}T12:00:00`
  return new Date(normalized).toLocaleDateString('pt-BR')
}

const STATUS_CONFIG: Record<LoteStatus, { label: string; className: string }> = {
  normal:  { label: 'Normal',  className: 'border-success/40 bg-success/10 text-success' },
  critico: { label: 'Crítico', className: 'border-warning/40 bg-warning/10 text-warning' },
  vencido: { label: 'Vencido', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

interface LotesTableProps {
  lotes: LoteMock[]
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function LotesTable({ lotes, page, limit, total, onPageChange }: LotesTableProps) {
  const totalPages = Math.ceil(total / limit)

  if (lotes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm py-16 text-center">
        <p className="font-display text-lg font-bold text-foreground">Nenhum lote encontrado</p>
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
              {['Produto', 'Lote', 'Validade', 'Qtd Disponível', 'Status', 'Notas'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left',
                    h === 'Qtd Disponível' && 'text-right',
                    h === 'Status' && 'text-center',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lotes.map((l, i) => {
              const status = getLoteStatus(l)
              const sc = STATUS_CONFIG[status]

              return (
                <tr
                  key={l.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/20',
                    i % 2 === 1 && 'bg-muted/10',
                    !l.active && 'opacity-50',
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-tight">{l.productName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{l.sku}</p>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-foreground">{l.code}</span>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {formatDate(l.expiresAt)}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                    {l.quantityAvailable.toLocaleString('pt-BR')}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={cn('text-xs', sc.className)}>
                      {sc.label}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {l.notes ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {total} lote{total !== 1 ? 's' : ''}
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
