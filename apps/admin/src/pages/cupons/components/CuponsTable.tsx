import { MoreHorizontal, PowerOff, Power, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  type Cupom,
  getCupomStatus,
  formatDesconto,
  STATUS_CONFIG,
  TIPO_LABEL,
} from '../types'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

interface CuponsTableProps {
  cupons: Cupom[]
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  onToggle: (cupom: Cupom) => void
  onEdit: (cupom: Cupom) => void
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
  deleteConfirmId: string | null
  togglingId: string | null
}

export function CuponsTable({
  cupons, page, limit, total, onPageChange,
  onToggle, onEdit, onDeleteClick, onDeleteConfirm, onDeleteCancel,
  deleteConfirmId, togglingId,
}: CuponsTableProps) {
  const totalPages = Math.ceil(total / limit)

  if (cupons.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm py-16 text-center">
        <p className="font-display text-lg font-bold text-foreground">Nenhum cupom encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou crie um novo cupom</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Código', 'Tipo', 'Desconto', 'Validade', 'Usos', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                    h === 'Usos' ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left',
                    h === '' && 'w-20',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cupons.map((c, i) => {
              const status = getCupomStatus(c)
              const sc = STATUS_CONFIG[status]
              const isOdd = i % 2 === 1
              const isDeleting = deleteConfirmId === c.id

              return (
                <tr
                  key={c.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/20',
                    isOdd && 'bg-muted/10',
                    isDeleting && 'bg-destructive/5',
                  )}
                >
                  {/* Código */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold text-foreground">{c.code}</span>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{c.description}</p>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-3 text-muted-foreground">{TIPO_LABEL[c.type]}</td>

                  {/* Desconto */}
                  <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                    {formatDesconto(c)}
                  </td>

                  {/* Validade */}
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.valid_from || c.valid_until ? (
                      <>{formatDate(c.valid_from)} → {formatDate(c.valid_until)}</>
                    ) : (
                      'Sem expiração'
                    )}
                  </td>

                  {/* Usos */}
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {c.uses_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={cn('text-xs', sc.className)}>
                      {sc.label}
                    </Badge>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => onDeleteConfirm(c.id)}
                        >
                          Excluir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={onDeleteCancel}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(c)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-muted-foreground"
                            disabled={togglingId === c.id}
                            onClick={() => onToggle(c)}
                          >
                            {c.active ? (
                              <><PowerOff className="mr-2 h-3.5 w-3.5" />Desativar</>
                            ) : (
                              <><Power className="mr-2 h-3.5 w-3.5" />Ativar</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={c.uses_count > 0}
                            onClick={() => onDeleteClick(c.id)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            {c.uses_count > 0 ? 'Excluir (em uso)' : 'Excluir'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          {total} cupom{total !== 1 ? 'ns' : ''}
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
