import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shield, ShoppingBag, CheckCircle, XCircle, Clock, Loader2, AlertCircle, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { maskPhone } from '@/lib/formatters'
import { api } from '@/lib/api'
import { type Cliente, type VendaResumo, type VendaResumoResponse } from './types'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const VENDA_STATUS_CONFIG: Record<VendaResumo['status'], { label: string; icon: React.ElementType; className: string }> = {
  FINALIZADA: { label: 'Finalizada', icon: CheckCircle, className: 'text-success bg-success/10 border-success/30' },
  CANCELADA:  { label: 'Cancelada',  icon: XCircle,      className: 'text-destructive bg-destructive/10 border-destructive/30' },
  ABERTA:     { label: 'Em aberto',  icon: Clock,        className: 'text-warning bg-warning/10 border-warning/30' },
}

const ORIGEM_LABEL: Record<VendaResumo['origem'], string> = {
  PDV:         'PDV',
  ECOMMERCE:   'E-commerce',
  PDV_OFFLINE: 'PDV Offline',
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [vendas, setVendas] = useState<VendaResumo[]>([])
  const [vendasTotal, setVendasTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [clienteError, setClienteError] = useState(false)
  const [vendasError, setVendasError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    setClienteError(false)
    setVendasError(false)

    Promise.all([
      api.get<Cliente>(`/customers/${id}`).catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) setNotFound(true)
        else setClienteError(true)
        return null
      }),
      api.get<VendaResumoResponse>('/vendas', { params: { cliente_id: id, limit: 20, page: 1 } }).catch(() => {
        setVendasError(true)
        return null
      }),
    ]).then(([clienteRes, vendasRes]) => {
      if (clienteRes) setCliente(clienteRes.data)
      if (vendasRes) {
        setVendas(vendasRes.data.data)
        setVendasTotal(vendasRes.data.total)
      }
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando…</span>
        </div>
      </div>
    )
  }

  if (notFound || (!loading && !cliente && !clienteError)) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/clientes')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para clientes
        </Button>
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    )
  }

  if (clienteError) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/clientes')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para clientes
        </Button>
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Não foi possível carregar o cliente. Tente novamente.</span>
        </div>
      </div>
    )
  }

  if (!cliente) return null

  const ultimoPedido = vendas[0]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {cliente.nome.split(' ').slice(0, 2).map((n) => n[0]).join('')}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{cliente.nome}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className={cn('text-xs', cliente.ativo ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground')}
                >
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                {cliente.consentimento_lgpd && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Consentimento LGPD
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total de pedidos', value: vendasError ? '—' : String(vendasTotal) },
          { label: 'Cadastrado em', value: formatDate(cliente.created_at) },
          { label: 'Último pedido', value: !vendasError && ultimoPedido ? formatDate(ultimoPedido.created_at) : '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p className="font-display text-xl font-bold text-foreground mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Dados de contato */}
      <Section title="Dados de contato" icon={Shield}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="Nome completo" value={cliente.nome} />
          <Field label="E-mail" value={cliente.email ?? '—'} />
          <Field label="Telefone" value={cliente.telefone_principal ? maskPhone(cliente.telefone_principal) : '—'} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CPF/CNPJ</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" />
              <span>Protegido (LGPD)</span>
            </div>
          </div>
          {cliente.consentimento_lgpd && cliente.consentimento_em && (
            <Field label="Consentimento em" value={formatDate(cliente.consentimento_em)} />
          )}
        </div>
      </Section>

      {/* Histórico de pedidos */}
      <Section title={vendasError ? 'Pedidos' : `Pedidos (${vendasTotal})`} icon={ShoppingBag}>
        {vendasError ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Não foi possível carregar os pedidos.</span>
          </div>
        ) : vendas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Nº', 'Data', 'Origem', 'Desconto', 'Total', 'Status'].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        'pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                        h === 'Total' || h === 'Desconto' ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendas.map((v, i) => {
                  const sc = VENDA_STATUS_CONFIG[v.status]
                  const Icon = sc.icon
                  return (
                    <tr key={v.id} className={cn('border-b border-border/50', i % 2 === 1 && 'bg-muted/10')}>
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground">#{v.numero}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground tabular-nums">{formatDateTime(v.created_at)}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{ORIGEM_LABEL[v.origem]}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {v.desconto_total_centavos > 0 ? `-${formatBRL(v.desconto_total_centavos)}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-foreground">
                        {formatBRL(v.total_liquido_centavos)}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', sc.className)}>
                          <Icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {vendasTotal > vendas.length && (
              <p className="text-xs text-muted-foreground mt-3">
                Mostrando {vendas.length} de {vendasTotal} pedidos. Acesse a página de Pedidos para ver todos.
              </p>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}
