import { useCallback, useEffect, useState } from 'react'
import { FileText, CreditCard, Cog, CheckCircle, XCircle, RefreshCw, Layers } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaxProfile {
  id: string
  nome: string
  regime_tributario: string
  descricao: string | null
  ativo: boolean
  padrao: boolean
}

interface TaxProfilesPage {
  data: TaxProfile[]
  total: number
  page: number
  limit: number
}

interface ProviderSummary {
  id: string
  slug: string
  nome_exibicao: string
  ativo: boolean
}

interface ChannelConfig {
  id: string
  canal: string
  ambiente: string
  provider: ProviderSummary
}

interface MethodMapping {
  id: string
  canal: string
  metodo: string
  provider_id: string
  ativo: boolean
  taxa_percentual: number
  taxa_fixa_centavos: number
}

interface PaymentData {
  providers: ProviderSummary[]
  channels: ChannelConfig[]
  methods: MethodMapping[]
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const METODO_LABEL: Record<string, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
  MAQUININHA_POINT: 'Maquininha Point',
  BOLETO: 'Boleto',
  DINHEIRO: 'Dinheiro',
}

const CANAL_LABEL: Record<string, string> = {
  PDV: 'PDV',
  ECOMMERCE: 'E-commerce',
}

const REGIME_LABEL: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
}

// ─── Shared components ────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-pulse">
      <div className="border-b border-border px-5 py-3">
        <div className="h-4 w-40 rounded bg-muted" />
      </div>
      <div className="p-5 space-y-3">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground mb-3">Falha ao carregar dados</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </button>
    </div>
  )
}

// ─── Tab Fiscal ───────────────────────────────────────────────────────────────

function TabFiscal() {
  const [profiles, setProfiles] = useState<TaxProfile[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data } = await api.get<TaxProfilesPage>('/tax-config/profiles', {
        params: { limit: 50 },
      })
      setProfiles(data.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) return <ErrorState onRetry={load} />

  if (!profiles || profiles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <Layers className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum perfil tributário cadastrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {profiles.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-sm font-bold text-foreground">{p.nome}</h3>
              <Badge variant="outline" className="text-[10px]">
                {REGIME_LABEL[p.regime_tributario] ?? p.regime_tributario}
              </Badge>
              {p.padrao && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-primary/40 text-primary bg-primary/5"
                >
                  Padrão
                </Badge>
              )}
            </div>
            {p.ativo ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          {p.descricao && (
            <div className="px-5 py-3">
              <p className="text-xs text-muted-foreground">{p.descricao}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Tab Pagamento ────────────────────────────────────────────────────────────

function TabPagamento() {
  const [data, setData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [providersRes, channelsRes, methodsRes] = await Promise.all([
        api.get<ProviderSummary[]>('/payment-config/providers'),
        api.get<ChannelConfig[]>('/payment-config/channels'),
        api.get<MethodMapping[]>('/payment-config/methods'),
      ])
      setData({
        providers: providersRes.data,
        channels: channelsRes.data,
        methods: methodsRes.data,
      })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) return <ErrorState onRetry={load} />

  if (!data || data.providers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum provedor de pagamento configurado</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.providers.map((provider) => {
        const providerChannels = data.channels.filter(
          (ch) => ch.provider.id === provider.id,
        )
        const providerMethods = data.methods.filter(
          (m) => m.provider_id === provider.id && m.ativo,
        )

        const methodsByCanal = providerMethods.reduce<Record<string, string[]>>((acc, m) => {
          if (!acc[m.canal]) acc[m.canal] = []
          acc[m.canal].push(m.metodo)
          return acc
        }, {})

        return (
          <div key={provider.id} className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-sm font-bold text-foreground">
                  {provider.nome_exibicao}
                </h3>
                {providerChannels.map((ch) => (
                  <Badge key={ch.id} variant="outline" className="text-[10px]">
                    {CANAL_LABEL[ch.canal] ?? ch.canal}
                  </Badge>
                ))}
                {providerChannels.map((ch) => (
                  <Badge
                    key={`env-${ch.id}`}
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      ch.ambiente === 'PRODUCAO'
                        ? 'border-success/40 text-success bg-success/5'
                        : 'border-warning/40 text-warning bg-warning/5',
                    )}
                  >
                    {ch.ambiente === 'PRODUCAO' ? 'Produção' : 'Sandbox'}
                  </Badge>
                ))}
              </div>
              {provider.ativo ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {Object.keys(methodsByCanal).length > 0 ? (
              <div className="p-5 space-y-3">
                {Object.entries(methodsByCanal).map(([canal, metodos]) => (
                  <div key={canal}>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      {CANAL_LABEL[canal] ?? canal}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {metodos.map((m) => (
                        <span
                          key={m}
                          className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                        >
                          {METODO_LABEL[m] ?? m}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground">Nenhum método ativo configurado</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab Geral ────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function TabGeral() {
  return (
    <div className="space-y-4">
      <SectionCard title="Sistema">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <Field label="Nome do sistema" value="Zoro&Kaya ERP" />
          <Field label="Fuso horário padrão" value="America/Sao_Paulo (UTC-3)" />
          <Field label="Idioma" value="Português (Brasil)" />
          <Field label="Moeda" value="BRL — Real Brasileiro" />
          <Field label="Versão" value="1.0.0-alpha" />
        </div>
      </SectionCard>

      <SectionCard title="Integrações ativas">
        <div className="space-y-2">
          {[
            { nome: 'Uber Direct', descricao: 'Entrega express', ativo: true },
            { nome: 'AI Content', descricao: 'Geração de conteúdo', ativo: true },
            { nome: 'NFe / NFCe', descricao: 'Emissão fiscal (plataforma)', ativo: false },
          ].map((i) => (
            <div
              key={i.nome}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{i.nome}</p>
                <p className="text-xs text-muted-foreground">{i.descricao}</p>
              </div>
              {i.ativo ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ConfiguracoesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Fiscal, pagamentos e sistema</p>
      </div>

      <Tabs defaultValue="fiscal">
        <TabsList className="mb-4">
          <TabsTrigger value="fiscal" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="geral" className="flex items-center gap-1.5">
            <Cog className="h-3.5 w-3.5" />
            Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fiscal">
          <TabFiscal />
        </TabsContent>
        <TabsContent value="pagamento">
          <TabPagamento />
        </TabsContent>
        <TabsContent value="geral">
          <TabGeral />
        </TabsContent>
      </Tabs>
    </div>
  )
}
