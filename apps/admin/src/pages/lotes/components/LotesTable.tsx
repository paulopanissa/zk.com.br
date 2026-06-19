import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LotItem {
  id: string
  code: string
  product: { id: string; name: string; sku: string | null }
  invoice_item: {
    id: string
    nf_entrada: { id: string; numero: string; serie: string | null }
  } | null
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

const STATUS_CONFIG: Record<LotStatus, { label: string; className: string; rowClass: string }> = {
  valido: {
    label: 'Válido',
    className: 'border-success/40 bg-success/10 text-success',
    rowClass: '',
  },
  vencendo: {
    label: 'Vencendo',
    className: 'border-warning/40 bg-warning/10 text-warning',
    rowClass: 'bg-warning/5',
  },
  vencido: {
    label: 'Vencido',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    rowClass: 'bg-destructive/5',
  },
  sem_validade: {
    label: 'Sem validade',
    className: 'border-border text-muted-foreground',
    rowClass: '',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LotesTableProps {
  lots: LotItem[]
  page: number
  limit: number
  total: number
  hasFilters: boolean
  onPageChange: (p: number) => void
}

export function LotesTable({ lots, page, limit, total, hasFilters, onPageChange }: LotesTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (lots.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-20 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground mb-1">
          {hasFilters ? 'Nenhum lote encontrado para este filtro' : 'Nenhum lote registrado ainda'}
        </p>
        <p className="text-xs text-muted-foreground">
          {hasFilters
            ? 'Tente ajustar os filtros ou limpar a busca.'
            : 'Lotes são criados automaticamente ao confirmar uma Nota de Entrada.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Produto</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Lote</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Validade</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Fabricação</th>
              <th className="px-4 py-3 text-center font-semibold text-foreground">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Qtd.</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Nota Fiscal</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const status = getLotStatus(lot)
              const { label, className, rowClass } = STATUS_CONFIG[status]
              const nf = lot.invoice_item?.nf_entrada
              const nfLabel = nf ? `NF ${nf.numero}${nf.serie ? `-${nf.serie}` : ''}` : null

              return (
                <tr
                  key={lot.id}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors hover:bg-muted/30',
                    rowClass,
                    !lot.active && 'opacity-50',
                  )}
                >
                  {/* Produto */}
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="font-medium text-foreground leading-snug truncate" title={lot.product.name}>
                      {lot.product.name}
                    </p>
                    {lot.product.sku && (
                      <p className="text-xs font-mono text-muted-foreground">{lot.product.sku}</p>
                    )}
                  </td>

                  {/* Lote */}
                  <td className="px-4 py-3 font-mono text-sm text-foreground whitespace-nowrap">
                    {lot.code}
                  </td>

                  {/* Validade */}
                  <td className={cn(
                    'px-4 py-3 whitespace-nowrap',
                    status === 'vencido' && 'font-semibold text-destructive',
                    status === 'vencendo' && 'font-semibold text-warning',
                    status === 'valido' && 'text-muted-foreground',
                    status === 'sem_validade' && 'text-muted-foreground',
                  )}>
                    {formatDate(lot.expires_at)}
                  </td>

                  {/* Fabricação */}
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(lot.manufactured_at)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={cn('whitespace-nowrap', className)}>
                      {label}
                    </Badge>
                  </td>

                  {/* Qtd. */}
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground whitespace-nowrap">
                    {formatQty(lot.quantity_received)}
                  </td>

                  {/* Nota Fiscal */}
                  <td className="px-4 py-3">
                    {nf ? (
                      <Link
                        to={`/notas-entrada/${nf.id}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-brand-orange hover:text-brand-brown hover:underline transition-colors whitespace-nowrap"
                        title={`Ver ${nfLabel}`}
                      >
                        {nfLabel}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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
      )}
    </div>
  )
}
