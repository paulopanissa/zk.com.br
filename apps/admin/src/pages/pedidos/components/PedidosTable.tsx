import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type VendaListItem, STATUS_CONFIG, ORIGEM_CONFIG, formatBRL } from '../types'

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('pt-BR') +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  )
}

interface PedidosTableProps {
  pedidos: VendaListItem[]
  page: number
  limit: number
  total: number
  hasFilters: boolean
  onPageChange: (page: number) => void
}

export function PedidosTable({ pedidos, page, limit, total, hasFilters, onPageChange }: PedidosTableProps) {
  const navigate = useNavigate()
  const totalPages = Math.ceil(total / limit)

  if (pedidos.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center">
        <p className="text-sm font-medium text-foreground mb-1">
          {hasFilters ? 'Nenhum pedido encontrado para este filtro' : 'Nenhum pedido registrado ainda'}
        </p>
        <p className="text-xs text-muted-foreground">
          {hasFilters
            ? 'Tente ajustar os filtros ou limpar a busca.'
            : 'Pedidos aparecem aqui quando criados pelo PDV ou e-commerce.'}
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
              {['Nº', 'Data', 'Cliente', 'Origem', 'Itens', 'Desconto', 'Total', 'Status'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left',
                    (h === 'Itens' || h === 'Desconto' || h === 'Total') && 'text-right',
                    h === 'Status' && 'text-center',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => {
              const sc = STATUS_CONFIG[p.status]
              const oc = ORIGEM_CONFIG[p.origem]

              return (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/pedidos/${p.id}`)}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/30 cursor-pointer',
                    sc.rowClass,
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-foreground">#{p.numero}</span>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateShort(p.created_at)}
                  </td>

                  <td className="px-4 py-3 max-w-[180px]">
                    {p.cliente ? (
                      <span className="text-foreground truncate block" title={p.cliente.nome}>
                        {p.cliente.nome}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Anônimo</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn('text-xs whitespace-nowrap', oc.className)}>
                      {oc.label}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {p._count.items}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground text-xs">
                    {p.desconto_total_centavos > 0 ? formatBRL(p.desconto_total_centavos) : '—'}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground whitespace-nowrap">
                    {formatBRL(p.total_liquido_centavos)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={cn('text-xs whitespace-nowrap', sc.className)}>
                      {sc.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {total} pedido{total !== 1 ? 's' : ''} · página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
