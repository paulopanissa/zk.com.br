import { Edit2, MoreHorizontal, PowerOff, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { type ProdutoMock, calcMargem } from '@/data/produtos.mock'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

interface ProdutosTableProps {
  produtos: ProdutoMock[]
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function ProdutosTable({
  produtos,
  page,
  limit,
  total,
  onPageChange,
}: ProdutosTableProps) {
  const totalPages = Math.ceil(total / limit)

  if (produtos.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                Produto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                Categoria
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                Marca
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-strong">
                Preço
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-strong">
                Margem
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-strong">
                Estoque
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-strong">
                Status
              </th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {produtos.map((p, i) => {
              const mg = calcMargem(p)
              const mgPositiva = mg > 0
              const estoqueAbaixoMinimo = p.estoque <= p.estoqueMinimo
              const isZebra = i % 2 === 1

              return (
                <tr
                  key={p.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-surface-alt/60',
                    isZebra && 'bg-surface-alt/30',
                  )}
                >
                  {/* Produto */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
                        {p.imagem ? (
                          <img
                            src={p.imagem}
                            alt={p.nome}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground leading-tight">{p.nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.sku}</p>
                      </div>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="px-4 py-3 text-foreground">{p.categoria}</td>

                  {/* Marca */}
                  <td className="px-4 py-3 text-muted-foreground">{p.marca}</td>

                  {/* Preço */}
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                    {formatBRL(p.precoVenda)}
                  </td>

                  {/* Margem */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        mgPositiva
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger',
                      )}
                    >
                      {mg.toFixed(1)}%
                    </span>
                  </td>

                  {/* Estoque */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="tabular-nums font-medium text-foreground">{p.estoque}</span>
                      {estoqueAbaixoMinimo && (
                        <span className="text-[10px] font-medium text-warning">
                          ↓ mín {p.estoqueMinimo}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        p.ativo
                          ? 'border-brand-sage/50 bg-brand-sage/20 text-brand-brown'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {p.ativo ? 'Ativo' : 'Inativo'}
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
                            {p.ativo ? 'Desativar' : 'Ativar'}
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

      {/* Paginação */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {total} produto{total !== 1 ? 's' : ''}
          {totalPages > 1 && ` · página ${page} de ${totalPages}`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
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
        <span className="text-5xl mb-4" role="img" aria-label="osso">
          🦴
        </span>
        <p className="font-display text-lg font-bold text-foreground">
          Nenhum produto ainda
        </p>
        <p className="font-accent text-brand-orange mt-1">
          cadastre o primeiro!
        </p>
        <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
          Novo produto
        </Button>
      </div>
    </div>
  )
}
