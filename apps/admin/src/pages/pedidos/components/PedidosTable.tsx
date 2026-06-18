import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { type VendaMock, formatBRL, STATUS_CONFIG, ORIGEM_CONFIG } from '@/data/pedidos.mock'

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface PedidosTableProps {
  pedidos: VendaMock[]
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function PedidosTable({ pedidos, page, limit, total, onPageChange }: PedidosTableProps) {
  const navigate = useNavigate()
  const totalPages = Math.ceil(total / limit)

  if (pedidos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm py-16 text-center">
        <p className="font-display text-lg font-bold text-foreground">Nenhum pedido encontrado</p>
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
            {pedidos.map((p, i) => {
              const sc = STATUS_CONFIG[p.status]
              const oc = ORIGEM_CONFIG[p.origem]

              return (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/pedidos/${p.id}`)}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/20 cursor-pointer',
                    i % 2 === 1 && 'bg-muted/10',
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-foreground">#{p.numero}</span>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateShort(p.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    {p.clienteNome ? (
                      <span className="text-foreground">{p.clienteNome}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Anônimo</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn('text-xs', oc.className)}>
                      {oc.label}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {p.itemsCount}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground text-xs">
                    {p.descontoTotalCentavos > 0 ? formatBRL(p.descontoTotalCentavos) : '—'}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                    {formatBRL(p.totalLiquidoCentavos)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={cn('text-xs', sc.className)}>
                      {sc.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {total} pedido{total !== 1 ? 's' : ''}
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
