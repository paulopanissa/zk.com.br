import { useNavigate } from 'react-router-dom'
import { Eye, UserX, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { maskPhone } from '@/lib/formatters'
import { type Cliente } from '../types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

interface ClientesTableProps {
  clientes: Cliente[]
  loading: boolean
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function ClientesTable({ clientes, loading, page, limit, total, onPageChange }: ClientesTableProps) {
  const navigate = useNavigate()
  const totalPages = Math.ceil(total / limit)

  if (loading && clientes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {[200, 180, 100, 80, 32].map((w, j) => (
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

  if (clientes.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {[
                { key: 'cliente', label: 'Cliente' },
                { key: 'contato', label: 'Contato' },
                { key: 'cadastro', label: 'Cadastro' },
                { key: 'status', label: 'Status' },
                { key: 'action', label: '' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left',
                    key === 'status' && 'text-center',
                    key === 'action' && 'w-16',
                  )}
                >
                  {label}
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
                    <p className="font-medium text-foreground">{c.nome}</p>
                  </div>
                </td>

                {/* Contato */}
                <td className="px-4 py-3">
                  {c.email && <p className="text-foreground">{c.email}</p>}
                  {c.telefone_principal && (
                    <p className="text-xs text-muted-foreground mt-0.5">{maskPhone(c.telefone_principal)}</p>
                  )}
                </td>

                {/* Cadastro */}
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {formatDate(c.created_at)}
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
                    {c.consentimento_lgpd && (
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
