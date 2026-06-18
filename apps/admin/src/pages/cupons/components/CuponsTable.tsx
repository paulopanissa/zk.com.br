import { MoreHorizontal, PowerOff, Power } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { type CupomMock, getCupomStatus, formatDesconto } from '@/data/cupons.mock'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

const STATUS_CONFIG = {
  ativo:    { label: 'Ativo',    className: 'border-success/40 bg-success/10 text-success' },
  inativo:  { label: 'Inativo',  className: 'border-border text-muted-foreground' },
  expirado: { label: 'Expirado', className: 'border-muted bg-muted/30 text-muted-foreground' },
  esgotado: { label: 'Esgotado', className: 'border-warning/40 bg-warning/10 text-warning' },
}

const TIPO_LABEL: Record<string, string> = {
  PERCENTUAL:   'Percentual',
  FIXO:         'Valor fixo',
  FRETE_GRATIS: 'Frete grátis',
}

interface CuponsTableProps {
  cupons: CupomMock[]
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  onToggleAtivo: (id: string) => void
}

export function CuponsTable({ cupons, page, limit, total, onPageChange, onToggleAtivo }: CuponsTableProps) {
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
                    h === '' && 'w-12',
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

              return (
                <tr
                  key={c.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/20',
                    isOdd && 'bg-muted/10',
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
                    {c.validFrom || c.validUntil ? (
                      <>
                        {formatDate(c.validFrom)} → {formatDate(c.validUntil)}
                      </>
                    ) : (
                      'Sem expiração'
                    )}
                  </td>

                  {/* Usos */}
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {c.usesCount}{c.maxUses !== null ? ` / ${c.maxUses}` : ''}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={cn('text-xs', sc.className)}>
                      {sc.label}
                    </Badge>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-muted-foreground"
                          onClick={() => onToggleAtivo(c.id)}
                        >
                          {c.active ? (
                            <><PowerOff className="mr-2 h-3.5 w-3.5" />Desativar</>
                          ) : (
                            <><Power className="mr-2 h-3.5 w-3.5" />Ativar</>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
