import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shield, MapPin, ShoppingBag, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CLIENTES_MOCK, CLIENTE_DETALHE_MOCK, type PedidoClienteMock } from '@/data/clientes.mock'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const STATUS_CONFIG: Record<PedidoClienteMock['status'], { label: string; icon: React.ElementType; className: string }> = {
  FINALIZADA: { label: 'Finalizada', icon: CheckCircle, className: 'text-success bg-success/10 border-success/30' },
  CANCELADA: { label: 'Cancelada', icon: XCircle, className: 'text-danger bg-danger/10 border-danger/30' },
  ABERTA: { label: 'Em aberto', icon: Clock, className: 'text-warning bg-warning/10 border-warning/30' },
}

const ORIGEM_LABEL: Record<string, string> = {
  PDV: 'PDV',
  ECOMMERCE: 'E-commerce',
  WHATSAPP: 'WhatsApp',
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

  const base = CLIENTES_MOCK.find((c) => c.id === id)
  const detalhe = id ? CLIENTE_DETALHE_MOCK[id] : undefined

  if (!base) {
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

  const pedidos = detalhe?.pedidos ?? []
  const pedidosFinalizados = pedidos.filter((p) => p.status === 'FINALIZADA')
  const totalGasto = pedidosFinalizados.reduce((s, p) => s + p.totalLiquidoCentavos, 0)
  const ticketMedio = pedidosFinalizados.length > 0 ? totalGasto / pedidosFinalizados.length : 0
  const ultimoPedido = pedidos[0]

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
              {base.nome.split(' ').slice(0, 2).map((n) => n[0]).join('')}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{base.nome}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className={cn('text-xs', base.ativo ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground')}
                >
                  {base.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                {base.consentimentoLgpd && (
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total de pedidos', value: String(base.totalPedidos) },
          { label: 'Total gasto', value: formatBRL(totalGasto || base.totalGastoCentavos) },
          { label: 'Ticket médio', value: formatBRL(ticketMedio) },
          { label: 'Último pedido', value: ultimoPedido ? formatDate(ultimoPedido.criadoEm) : '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p className="font-display text-xl font-bold text-foreground mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Dados pessoais */}
      <Section title="Dados pessoais" icon={Shield}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="Nome completo" value={base.nome} />
          <Field label="CPF/CNPJ" value={base.cpfCnpjMascarado} />
          <Field label="Data de nascimento" value={detalhe?.dataNascimento ? formatDate(detalhe.dataNascimento) : '***'} />
          <Field label="E-mail" value={base.email} />
          <Field label="Telefone" value={base.telefonePrincipal} />
          <Field label="Cadastrado em" value={formatDate(base.dataCadastro)} />
        </div>
      </Section>

      {/* Endereços */}
      {detalhe?.enderecos && detalhe.enderecos.length > 0 && (
        <Section title="Endereços" icon={MapPin}>
          <div className="space-y-3">
            {detalhe.enderecos.map((end) => (
              <div key={end.id} className="rounded-lg border border-border px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-foreground">
                    {end.logradouro}, {end.numero}{end.complemento ? `, ${end.complemento}` : ''} — {end.bairro}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {end.cidade}/{end.uf} · CEP {end.cep}
                  </p>
                </div>
                {end.principal && (
                  <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary bg-primary/5">
                    Principal
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Histórico de pedidos */}
      <Section title={`Pedidos (${pedidos.length})`} icon={ShoppingBag}>
        {pedidos.length === 0 ? (
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
                {pedidos.map((p, i) => {
                  const sc = STATUS_CONFIG[p.status]
                  const Icon = sc.icon
                  return (
                    <tr key={p.id} className={cn('border-b border-border/50', i % 2 === 1 && 'bg-muted/10')}>
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground">#{p.numero}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground tabular-nums">{formatDateTime(p.criadoEm)}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{ORIGEM_LABEL[p.origem]}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {p.descontoTotalCentavos > 0 ? `-${formatBRL(p.descontoTotalCentavos)}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-foreground">
                        {formatBRL(p.totalLiquidoCentavos)}
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
          </div>
        )}
      </Section>
    </div>
  )
}
