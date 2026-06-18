import { useNavigate } from 'react-router-dom'
import { Eye, UserX, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type ClienteMock } from '@/data/clientes.mock'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

interface ClientesTableProps {
  clientes: ClienteMock[]
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function ClientesTable({ clientes, page, limit, total, onPageChange }: ClientesTableProps) {
  const navigate = useNavigate()
  const totalPages = Math.ceil(total / limit)

  if (clientes.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Cliente', 'Contato', 'Cidade/UF', 'Cadastro', 'Total gasto', 'Pedidos', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                    h === 'Total gasto' || h === 'Pedidos' ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left',
                    h === '' && 'w-16',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientes.map((c, i) => (
              <tr
                key={c.id}
                className={cn(
                  'border-b border-border/50 transition-colors hover:bg-muted/20 cursor-pointer',
                  i % 2 === 1 && 'bg-muted/10',
                )}
                onClick={() => navigate(`/clientes/${c.id}`)}
              >
                {/* Cliente */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                      {c.nome.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.cpfCnpjMascarado}</p>
                    </div>
                  </div>
                </td>

                {/* Contato */}
                <td className="px-4 py-3">
                  <p className="text-foreground">{c.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.telefonePrincipal}</p>
                </td>

                {/* Cidade/UF */}
                <td className="px-4 py-3 text-muted-foreground">
                  {c.cidade}/{c.uf}
                </td>

                {/* Cadastro */}
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {formatDate(c.dataCadastro)}
                </td>

                {/* Total gasto */}
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                  {formatBRL(c.totalGastoCentavos)}
                </td>

                {/* Pedidos */}
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {c.totalPedidos}
                </td>

                {/* Status */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        c.ativo
                          ? 'border-success/40 bg-success/10 text-success'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {c.consentimentoLgpd && (
                      <span title="Consentimento LGPD">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                      </span>
                    )}
                  </div>
                </td>

                {/* Ação */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/clientes/${c.id}`)}
                    title="Ver detalhe"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {total} cliente{total !== 1 ? 's' : ''}
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
        <UserX className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="font-display text-lg font-bold text-foreground">Nenhum cliente encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros</p>
      </div>
    </div>
  )
}
