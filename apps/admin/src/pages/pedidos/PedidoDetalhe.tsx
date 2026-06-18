import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, CreditCard, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  PEDIDOS_MOCK,
  PEDIDOS_DETALHE_MOCK,
  formatBRL,
  formatPaymentMethod,
  STATUS_CONFIG,
  ORIGEM_CONFIG,
} from '@/data/pedidos.mock'

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function PedidoDetalhe() {
  const { id } = useParams<{ id: string | undefined }>()
  const navigate = useNavigate()

  const base = PEDIDOS_MOCK.find((p) => p.id === id)
  const detalhe = id ? PEDIDOS_DETALHE_MOCK[id] : undefined

  if (!base) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/pedidos')}>
          Voltar
        </Button>
      </div>
    )
  }

  const sc = STATUS_CONFIG[base.status]
  const oc = ORIGEM_CONFIG[base.origem]

  const items = detalhe?.items ?? []
  const payments = detalhe?.payments ?? []

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pedidos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold text-foreground">
                Pedido #{base.numero}
              </h1>
              <Badge variant="outline" className={cn('text-sm', sc.className)}>{sc.label}</Badge>
              <Badge variant="outline" className={cn('text-sm', oc.className)}>{oc.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Criado em {formatDateTime(base.createdAt)} por {base.createdBy}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left — items + financeiro */}
        <div className="lg:col-span-2 space-y-5">
          {/* Itens */}
          <SectionCard title="Itens do pedido" icon={Package}>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Itens não disponíveis no mock.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 -mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left">Produto</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Qtd</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Preço unit.</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Desconto</th>
                      <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/10">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {item.quantidade}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatBRL(item.precoUnitarioCentavos)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground text-xs">
                          {item.descontoItemCentavos > 0 ? formatBRL(item.descontoItemCentavos) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                          {formatBRL(item.totalCentavos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Resumo financeiro */}
                <div className="border-t border-border px-4 py-3 space-y-1.5 bg-muted/5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatBRL(base.totalBrutoCentavos)}</span>
                  </div>
                  {base.descontoTotalCentavos > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Desconto</span>
                      <span className="tabular-nums text-destructive">-{formatBRL(base.descontoTotalCentavos)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
                    <span>Total</span>
                    <span className="tabular-nums">{formatBRL(base.totalLiquidoCentavos)}</span>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Observação */}
          {detalhe?.observacao && (
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Observação: </span>
              {detalhe.observacao}
            </div>
          )}
        </div>

        {/* Right — cliente + pagamentos */}
        <div className="space-y-5">
          {/* Cliente */}
          <SectionCard title="Cliente" icon={User}>
            {base.clienteNome ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">{base.clienteNome}</p>
                {base.clienteId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/clientes/${base.clienteId}`)}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver perfil do cliente →
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Cliente não identificado</p>
            )}
          </SectionCard>

          {/* Pagamentos */}
          <SectionCard title="Pagamentos" icon={CreditCard}>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sem pagamento registrado.</p>
            ) : (
              <div className="space-y-3">
                {payments.map((pg) => (
                  <div key={pg.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{formatPaymentMethod(pg.metodo)}</p>
                      {pg.trocoCentavos > 0 && (
                        <p className="text-xs text-muted-foreground">Troco: {formatBRL(pg.trocoCentavos)}</p>
                      )}
                    </div>
                    <span className="tabular-nums font-semibold text-foreground">
                      {formatBRL(pg.valorCentavos)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Datas */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criado em</span>
              <span className="text-foreground tabular-nums">{formatDateTime(base.createdAt)}</span>
            </div>
            {base.finalizadaEm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Finalizado em</span>
                <span className="text-success tabular-nums">{formatDateTime(base.finalizadaEm)}</span>
              </div>
            )}
            {base.canceladaEm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancelado em</span>
                <span className="text-destructive tabular-nums">{formatDateTime(base.canceladaEm)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
