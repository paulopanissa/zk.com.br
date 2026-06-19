import { Edit2, MoreHorizontal, PowerOff, Package, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { type Product, calcMargem } from '../types'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

interface ProdutosTableProps {
  produtos: Product[]
  loading: boolean
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function ProdutosTable({ produtos, loading, page, limit, total, onPageChange }: ProdutosTableProps) {
  const totalPages = Math.ceil(total / limit)

  if (loading && produtos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {[260, 120, 100, 80, 60, 60].map((w, j) => (
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

  if (!loading && produtos.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {[
                { key: 'produto',   label: 'Produto',   align: 'left' },
                { key: 'categoria', label: 'Categoria', align: 'left' },
                { key: 'marca',     label: 'Marca',     align: 'left' },
                { key: 'preco',     label: 'Preço',     align: 'right' },
                { key: 'margem',    label: 'Margem',    align: 'right' },
                { key: 'status',    label: 'Status',    align: 'center' },
                { key: 'actions',   label: '',          align: 'right' },
              ].map(({ key, label, align }) => (
                <th
                  key={key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                    align === 'left' && 'text-left',
                    align === 'right' && 'text-right',
                    align === 'center' && 'text-center',
                    key === 'actions' && 'w-20',
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {produtos.map((p, i) => {
              const mg = calcMargem(p.pricing)
              const mgPositiva = mg > 0

              return (
                <tr
                  key={p.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/20',
                    i % 2 === 1 && 'bg-muted/10',
                    !p.active && 'opacity-60',
                  )}
                >
                  {/* Produto */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20">
                        {p.media[0]?.url ? (
                          <img
                            src={p.media[0].url}
                            alt={p.name}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground leading-tight truncate max-w-[200px]">{p.name}</p>
                          {p.featured && (
                            <Star className="h-3 w-3 shrink-0 text-warning fill-warning" />
                          )}
                        </div>
                        {p.sku && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{p.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {p.category?.name ?? '—'}
                  </td>

                  {/* Marca */}
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {p.brand?.name ?? '—'}
                  </td>

                  {/* Preço */}
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                    {p.pricing ? formatBRL(p.pricing.sale_price_cents) : '—'}
                  </td>

                  {/* Margem */}
                  <td className="px-4 py-3 text-right">
                    {p.pricing ? (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                          mgPositiva ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                        )}
                      >
                        {mg.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        p.active
                          ? 'border-success/40 bg-success/10 text-success'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {p.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
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
                          <DropdownMenuItem className="text-muted-foreground">
                            <PowerOff className="mr-2 h-3.5 w-3.5" />
                            {p.active ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              )
            })}
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

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="font-display text-lg font-bold text-foreground">Nenhum produto encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros</p>
      </div>
    </div>
  )
}
