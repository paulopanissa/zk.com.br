import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, CreditCard, Package, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  type VendaDetail,
  STATUS_CONFIG,
  ORIGEM_CONFIG,
  PAYMENT_STATUS_CONFIG,
  formatBRL,
  formatPaymentMethod,
  formatQty,
} from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PedidoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [venda, setVenda] = useState<VendaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cancel flow
  const [cancelando, setCancelando] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    api
      .get<VendaDetail>(`/vendas/${id}`)
      .then((r) => setVenda(r.data))
      .catch(() => setError('Pedido não encontrado ou erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleCancel() {
    if (!id || !venda) return
    setCancelando(true)
    setCancelError(null)
    try {
      await api.post(`/vendas/${id}/cancelar`)
      setVenda((prev) => prev ? { ...prev, status: 'CANCELADA' } : prev)
      setCancelConfirm(false)
    } catch {
      setCancelError('Não foi possível cancelar o pedido. Tente novamente.')
    } finally {
      setCancelando(false)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pedidos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-2 animate-pulse">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-4 w-64 rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card h-64 animate-pulse" />
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card h-28 animate-pulse" />
            <div className="rounded-xl border border-border bg-card h-28 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // ─── Error ───────────────────────────────────────────────────────────────────

  if (error || !venda) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">{error ?? 'Pedido não encontrado.'}</p>
        <Button variant="outline" onClick={() => navigate('/pedidos')}>
          Voltar para pedidos
        </Button>
      </div>
    )
  }

  const sc = STATUS_CONFIG[venda.status]
  const oc = ORIGEM_CONFIG[venda.origem]
  const canCancel = venda.status === 'ABERTA' || venda.status === 'FINALIZADA'

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pedidos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl font-bold text-foreground">
                Pedido #{venda.numero}
              </h1>
              <Badge variant="outline" className={cn('text-sm', sc.className)}>{sc.label}</Badge>
              <Badge variant="outline" className={cn('text-sm', oc.className)}>{oc.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Criado em {formatDateTime(venda.created_at)}
            </p>
          </div>
        </div>

        {/* Cancel action */}
        {canCancel && venda.status !== 'CANCELADA' && (
          <div className="flex items-center gap-2">
            {cancelConfirm ? (
              <>
                <span className="text-sm text-muted-foreground">Confirmar cancelamento?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={cancelando}
                  onClick={handleCancel}
                >
                  {cancelando ? 'Cancelando…' : 'Cancelar pedido'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCancelConfirm(false); setCancelError(null) }}
                >
                  Manter
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setCancelConfirm(true)}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Cancelar pedido
              </Button>
            )}
          </div>
        )}
      </div>

      {cancelError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {cancelError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left — items + financeiro */}
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title={`Itens (${venda.items.length})`} icon={Package}>
            {venda.items.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum item neste pedido.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 -mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {['Produto', 'Qtd', 'Preço unit.', 'Desconto', 'Total'].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            'px-4 py-2 text-xs font-semibold text-muted-foreground',
                            h === 'Produto' ? 'text-left' : 'text-right',
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {venda.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/10">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground leading-snug">
                            {item.product.name}
                          </p>
                          {item.product.sku && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.product.sku}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                          {formatQty(item.quantidade)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                          {formatBRL(item.preco_unitario_centavos)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground text-xs whitespace-nowrap">
                          {item.desconto_item_centavos > 0
                            ? `-${formatBRL(item.desconto_item_centavos)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground whitespace-nowrap">
                          {formatBRL(item.total_centavos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Resumo financeiro */}
                <div className="border-t border-border px-4 py-3 space-y-1.5 bg-muted/5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatBRL(venda.total_bruto_centavos)}</span>
                  </div>
                  {venda.desconto_total_centavos > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Desconto</span>
                      <span className="tabular-nums text-destructive">
                        -{formatBRL(venda.desconto_total_centavos)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
                    <span>Total</span>
                    <span className="tabular-nums">{formatBRL(venda.total_liquido_centavos)}</span>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {venda.observacao && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Observação: </span>
              {venda.observacao}
            </div>
          )}
        </div>

        {/* Right — cliente + pagamentos + datas */}
        <div className="space-y-5">
          <SectionCard title="Cliente" icon={User}>
            {venda.cliente ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">{venda.cliente.nome}</p>
                {venda.cliente.telefone_principal && (
                  <p className="text-xs text-muted-foreground">{venda.cliente.telefone_principal}</p>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/clientes/${venda.cliente!.id}`)}
                  className="text-xs text-primary hover:underline"
                >
                  Ver perfil →
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Cliente não identificado</p>
            )}
          </SectionCard>

          <SectionCard title={`Pagamentos (${venda.payments.length})`} icon={CreditCard}>
            {venda.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-3">
                {venda.payments.map((pg) => {
                  const ps = PAYMENT_STATUS_CONFIG[pg.status]
                  return (
                    <div key={pg.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {formatPaymentMethod(pg.metodo)}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] h-5 px-1.5', ps.className)}
                        >
                          {ps.label}
                        </Badge>
                        {pg.troco_centavos > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Troco: {formatBRL(pg.troco_centavos)}
                          </p>
                        )}
                      </div>
                      <span className="tabular-nums font-semibold text-foreground whitespace-nowrap">
                        {formatBRL(pg.valor_centavos)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Timestamps */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Criado em</span>
              <span className="text-foreground tabular-nums text-right">
                {formatDateTime(venda.created_at)}
              </span>
            </div>
            {venda.finalizada_em && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Finalizado em</span>
                <span className="text-success tabular-nums text-right">
                  {formatDateTime(venda.finalizada_em)}
                </span>
              </div>
            )}
            {venda.cancelada_em && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Cancelado em</span>
                <span className="text-destructive tabular-nums text-right">
                  {formatDateTime(venda.cancelada_em)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
