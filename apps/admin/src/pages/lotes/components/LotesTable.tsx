import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LotItem {
  id: string
  code: string
  product: { id: string; name: string; sku: string | null }
  expires_at: string | null
  manufactured_at: string | null
  quantity_received: string | number
  invoice_item_id: string | null
  active: boolean
  tags: string[]
  notes: string | null
}

export type LotStatus = 'valido' | 'vencendo' | 'vencido' | 'sem_validade'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse date-only strings (YYYY-MM-DD) avoiding UTC midnight → UTC-3 day shift */
function parseDate(dateStr: string): Date {
  return new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr)
}

export function getLotStatus(lot: LotItem): LotStatus {
  if (!lot.expires_at) return 'sem_validade'
  const exp = parseDate(lot.expires_at)
  const now = new Date()
  if (exp < now) return 'vencido'
  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  if (exp <= thirtyDaysOut) return 'vencendo'
  return 'valido'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return parseDate(dateStr).toLocaleDateString('pt-BR')
}

function formatQty(qty: string | number): string {
  const n = typeof qty === 'string' ? parseFloat(qty) : qty
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

const STATUS_CONFIG: Record<LotStatus, { label: string; className: string }> = {
  valido: {
    label: 'Válido',
    className: 'border-success/40 bg-success/10 text-success',
  },
  vencendo: {
    label: 'Vencendo',
    className: 'border-warning/40 bg-warning/10 text-warning',
  },
  vencido: {
    label: 'Vencido',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  sem_validade: {
    label: 'Sem validade',
    className: 'border-border text-muted-foreground',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LotesTableProps {
  lots: LotItem[]
  page: number
  limit: number
  total: number
  onPageChange: (p: number) => void
}

export function LotesTable({ lots, page, limit, total, onPageChange }: LotesTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (lots.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card py-16 text-center text-sm text-muted-foreground shadow-sm">
        Nenhum lote encontrado.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Produto</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Lote</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Validade</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Fabricação</th>
              <th className="px-4 py-3 text-center font-semibold text-foreground">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Qtd. Recebida</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">NF</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot, i) => {
              const status = getLotStatus(lot)
              const { label, className } = STATUS_CONFIG[status]
              return (
                <tr
                  key={lot.id}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors hover:bg-muted/20',
                    i % 2 === 1 && 'bg-muted/10',
                    !lot.active && 'opacity-50',
                  )}
                >
                  {/* Produto */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-snug">{lot.product.name}</p>
                    {lot.product.sku && (
                      <p className="text-xs font-mono text-muted-foreground">{lot.product.sku}</p>
                    )}
                  </td>

                  {/* Lote */}
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{lot.code}</td>

                  {/* Validade */}
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(lot.expires_at)}</td>

                  {/* Fabricação */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(lot.manufactured_at)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={className}>
                      {label}
                    </Badge>
                  </td>

                  {/* Qtd. Recebida */}
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                    {formatQty(lot.quantity_received)}
                  </td>

                  {/* NF */}
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {lot.invoice_item_id ? lot.invoice_item_id.slice(0, 8) + '…' : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {total} {total === 1 ? 'lote' : 'lotes'} · página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
