import { useCallback, useEffect, useState } from 'react'
import {
  FileText,
  CreditCard,
  Cog,
  CheckCircle,
  XCircle,
  RefreshCw,
  Layers,
  KeyRound,
  Zap,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Wifi,
  Truck,
  MapPin,
  Clock,
  Phone,
  Package,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentEnvironment = 'SANDBOX' | 'PRODUCAO'
type PaymentChannel = 'PDV' | 'ECOMMERCE'
type PaymentMethod =
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'PIX'
  | 'BOLETO'
  | 'DINHEIRO'
  | 'MAQUININHA_POINT'

interface ProviderSummary {
  id: string
  slug: string
  nome_exibicao: string
  ativo: boolean
}

interface CredentialInfo {
  chave: string
  ambiente: PaymentEnvironment
  configurado: true
}

interface ProviderDetail extends ProviderSummary {
  credentials: CredentialInfo[]
}

interface ChannelConfig {
  id: string
  canal: PaymentChannel
  ambiente: PaymentEnvironment
  provider: ProviderSummary
}

interface MethodMapping {
  id: string
  canal: PaymentChannel
  metodo: PaymentMethod
  provider_id: string
  ativo: boolean
  taxa_percentual: number
  taxa_fixa_centavos: number
}

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

interface DeliveryConfig {
  id: string
  provider: 'UBER_DIRECT' | 'FRETE_GRATIS'
  active: boolean
  free_shipping_threshold_centavos: number | null
  updated_at: string
}

interface QuoteResult {
  fee_centavos: number
  eta_seconds: number
  quote_id: string | null
  expires_at: string | null
  provider: 'UBER_DIRECT' | 'FRETE_GRATIS'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METODO_LABEL: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
  MAQUININHA_POINT: 'Maquininha Point',
  BOLETO: 'Boleto',
  DINHEIRO: 'Dinheiro',
}

const CANAL_LABEL: Record<PaymentChannel, string> = {
  PDV: 'PDV',
  ECOMMERCE: 'E-commerce',
}

const REGIME_LABEL: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
}

const REQUIRED_KEYS: Record<string, string[]> = {
  MERCADO_PAGO: ['ACCESS_TOKEN', 'PUBLIC_KEY'],
  ASAAS: ['API_KEY'],
  STRIPE: ['SECRET_KEY', 'PUBLISHABLE_KEY'],
  PAGSEGURO: ['CLIENT_ID', 'CLIENT_SECRET'],
  PAYPAL: ['CLIENT_ID', 'CLIENT_SECRET'],
}

const ALL_METHODS: PaymentMethod[] = [
  'PIX',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'MAQUININHA_POINT',
  'BOLETO',
  'DINHEIRO',
]

// ─── Shared components ────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ElementType
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-pulse">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
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

// ─── Credential Dialog ────────────────────────────────────────────────────────

function CredentialDialog({
  provider,
  open,
  onClose,
  onSaved,
}: {
  provider: ProviderDetail | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [ambiente, setAmbiente] = useState<PaymentEnvironment>('SANDBOX')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const requiredKeys = provider ? (REQUIRED_KEYS[provider.slug] ?? []) : []

  function isConfigured(chave: string) {
    return provider?.credentials.some((c) => c.chave === chave && c.ambiente === ambiente) ?? false
  }

  async function handleSave() {
    if (!provider) return
    const credentials = requiredKeys
      .filter((k) => values[k]?.trim())
      .map((k) => ({ chave: k, valor: values[k].trim(), ambiente }))
    if (credentials.length === 0) {
      setError('Insira ao menos uma credencial')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.put(`/payment-config/providers/${provider.slug}/credentials`, { credentials })
      setSuccess(true)
      setValues({})
      onSaved()
      setTimeout(() => setSuccess(false), 2000)
    } catch {
      setError('Erro ao salvar credenciais')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(chave: string) {
    if (!provider) return
    try {
      await api.delete(
        `/payment-config/providers/${provider.slug}/credentials/${chave}?ambiente=${ambiente}`,
      )
      onSaved()
    } catch {
      setError('Erro ao remover credencial')
    }
  }

  if (!provider) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Credenciais — {provider.nome_exibicao}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ambiente</label>
            <Select value={ambiente} onValueChange={(v) => setAmbiente(v as PaymentEnvironment)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SANDBOX">Sandbox (testes)</SelectItem>
                <SelectItem value="PRODUCAO">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {requiredKeys.map((chave) => (
              <div key={chave} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground font-mono">{chave}</label>
                  {isConfigured(chave) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> configurado
                      </span>
                      <button
                        onClick={() => handleDelete(chave)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={isConfigured(chave) ? '••••••••••••' : 'Inserir valor...'}
                  value={values[chave] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [chave]: e.target.value }))}
                  className="h-9 font-mono text-sm"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Credenciais salvas
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar credenciais'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Method Dialog ────────────────────────────────────────────────────────

function AddMethodDialog({
  open,
  providers,
  onClose,
  onSaved,
}: {
  open: boolean
  providers: ProviderSummary[]
  onClose: () => void
  onSaved: () => void
}) {
  const [canal, setCanal] = useState<PaymentChannel>('PDV')
  const [metodo, setMetodo] = useState<PaymentMethod>('PIX')
  const [providerId, setProviderId] = useState('')
  const [taxaPct, setTaxaPct] = useState('')
  const [taxaFixed, setTaxaFixed] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeProviders = providers.filter((p) => p.ativo)

  async function handleSave() {
    if (!providerId) {
      setError('Selecione um provedor')
      return
    }
    const pct = parseFloat(taxaPct.replace(',', '.'))
    const fixed = parseFloat(taxaFixed.replace(',', '.'))
    if (taxaPct && isNaN(pct)) {
      setError('Taxa % inválida — use ponto como separador decimal (ex: 1.50)')
      return
    }
    if (taxaFixed && isNaN(fixed)) {
      setError('Taxa fixa inválida — use ponto como separador decimal (ex: 0.50)')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.put('/payment-config/methods', {
        canal,
        metodo,
        provider_id: providerId,
        taxa_percentual: Math.round((pct || 0) * 100),
        taxa_fixa_centavos: Math.round((fixed || 0) * 100),
      })
      onSaved()
      onClose()
    } catch {
      setError('Erro ao salvar mapeamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar método de pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Canal</label>
              <Select value={canal} onValueChange={(v) => setCanal(v as PaymentChannel)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDV">PDV</SelectItem>
                  <SelectItem value="ECOMMERCE">E-commerce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Método</label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as PaymentMethod)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {METODO_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Provedor</label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {activeProviders.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome_exibicao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Taxa % (ex: 1.50)</label>
              <Input
                placeholder="0.00"
                value={taxaPct}
                onChange={(e) => setTaxaPct(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Taxa fixa (R$)</label>
              <Input
                placeholder="0.00"
                value={taxaFixed}
                onChange={(e) => setTaxaFixed(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Providers Section ────────────────────────────────────────────────────────

function ProvidersSection({
  providers,
  onRefresh,
}: {
  providers: ProviderSummary[]
  onRefresh: () => void
}) {
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({})
  const [testingSlug, setTestingSlug] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})
  const [credentialTarget, setCredentialTarget] = useState<ProviderDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function openCredentials(slug: string) {
    setLoadingDetail(true)
    try {
      const { data } = await api.get<ProviderDetail>(`/payment-config/providers/${slug}`)
      setCredentialTarget(data)
    } catch {
      const found = providers.find((p) => p.slug === slug)
      if (found) setCredentialTarget({ ...found, credentials: [] })
    } finally {
      setLoadingDetail(false)
    }
  }

  async function toggleProvider(provider: ProviderSummary) {
    if (togglingSlug) return
    setTogglingSlug(provider.slug)
    setToggleErrors((e) => ({ ...e, [provider.slug]: '' }))
    try {
      const action = provider.ativo ? 'deactivate' : 'activate'
      await api.put(`/payment-config/providers/${provider.slug}/${action}`)
      onRefresh()
    } catch (err) {
      const apiErr = err as { response?: { data?: { message?: string; missing_keys?: string[] } } }
      const missing = apiErr.response?.data?.missing_keys
      const msg = missing?.length
        ? `Credenciais ausentes: ${missing.join(', ')}`
        : (apiErr.response?.data?.message ?? 'Erro ao alterar status')
      setToggleErrors((e) => ({ ...e, [provider.slug]: msg }))
    } finally {
      setTogglingSlug(null)
    }
  }

  async function testProvider(slug: string) {
    setTestingSlug(slug)
    setTestResults((r) => ({ ...r, [slug]: null }))
    try {
      await api.post(`/payment-config/providers/${slug}/test`)
      setTestResults((r) => ({ ...r, [slug]: true }))
    } catch {
      setTestResults((r) => ({ ...r, [slug]: false }))
    } finally {
      setTestingSlug(null)
    }
  }

  return (
    <SectionCard icon={CreditCard} title="Provedores de pagamento">
      {providers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum provedor cadastrado
        </p>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-lg border border-border/60 bg-background overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{provider.nome_exibicao}</p>
                    <p className="text-xs text-muted-foreground font-mono">{provider.slug}</p>
                  </div>
                  <Badge
                    variant={provider.ativo ? 'default' : 'secondary'}
                    className="text-[10px] shrink-0"
                  >
                    {provider.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {testResults[provider.slug] === true && (
                    <span className="text-xs text-success flex items-center gap-1 shrink-0">
                      <CheckCircle className="h-3 w-3" /> OK
                    </span>
                  )}
                  {testResults[provider.slug] === false && (
                    <span className="text-xs text-destructive flex items-center gap-1 shrink-0">
                      <XCircle className="h-3 w-3" /> Falhou
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1"
                    disabled={loadingDetail}
                    onClick={() => openCredentials(provider.slug)}
                  >
                    <KeyRound className="h-3 w-3" />
                    Credenciais
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1"
                    disabled={testingSlug === provider.slug}
                    onClick={() => testProvider(provider.slug)}
                  >
                    <Wifi className="h-3 w-3" />
                    {testingSlug === provider.slug ? 'Testando...' : 'Testar'}
                  </Button>
                  <Button
                    size="sm"
                    variant={provider.ativo ? 'outline' : 'default'}
                    className="h-7 px-2.5 text-xs"
                    disabled={togglingSlug === provider.slug}
                    onClick={() => toggleProvider(provider)}
                  >
                    {togglingSlug === provider.slug
                      ? '...'
                      : provider.ativo
                        ? 'Desativar'
                        : 'Ativar'}
                  </Button>
                </div>
              </div>
              {toggleErrors[provider.slug] && (
                <div className="border-t border-border/60 bg-destructive/5 px-4 py-2">
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3 shrink-0" />
                    {toggleErrors[provider.slug]}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CredentialDialog
        provider={credentialTarget}
        open={credentialTarget !== null}
        onClose={() => setCredentialTarget(null)}
        onSaved={() => {
          onRefresh()
          if (credentialTarget) openCredentials(credentialTarget.slug)
        }}
      />
    </SectionCard>
  )
}

// ─── Channels Section ─────────────────────────────────────────────────────────

function ChannelsSection({
  channels,
  providers,
  onRefresh,
}: {
  channels: ChannelConfig[]
  providers: ProviderSummary[]
  onRefresh: () => void
}) {
  const CANAIS: PaymentChannel[] = ['PDV', 'ECOMMERCE']
  const activeProviders = providers.filter((p) => p.ativo)

  return (
    <SectionCard icon={Cog} title="Configuração de canais">
      <div className="grid gap-4 sm:grid-cols-2">
        {CANAIS.map((canal) => (
          <ChannelCard
            key={canal}
            canal={canal}
            config={channels.find((c) => c.canal === canal) ?? null}
            providers={activeProviders}
            onSaved={onRefresh}
          />
        ))}
      </div>
    </SectionCard>
  )
}

function ChannelCard({
  canal,
  config,
  providers,
  onSaved,
}: {
  canal: PaymentChannel
  config: ChannelConfig | null
  providers: ProviderSummary[]
  onSaved: () => void
}) {
  const [providerId, setProviderId] = useState(config?.provider.id ?? '')
  const [ambiente, setAmbiente] = useState<PaymentEnvironment>(config?.ambiente ?? 'SANDBOX')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setProviderId(config?.provider.id ?? '')
    setAmbiente(config?.ambiente ?? 'SANDBOX')
  }, [config])

  async function handleSave() {
    if (!providerId) {
      setError('Selecione um provedor')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.put(`/payment-config/channels/${canal}`, {
        provider_id: providerId,
        ambiente,
      })
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{CANAL_LABEL[canal]}</p>
        {config && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              config.ambiente === 'PRODUCAO'
                ? 'border-success/40 text-success bg-success/5'
                : 'border-amber-400/40 text-amber-600 bg-amber-50',
            )}
          >
            {config.ambiente === 'PRODUCAO' ? 'Produção' : 'Sandbox'}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <Select value={providerId} onValueChange={setProviderId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecionar provedor..." />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome_exibicao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ambiente} onValueChange={(v) => setAmbiente(v as PaymentEnvironment)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SANDBOX">Sandbox</SelectItem>
            <SelectItem value="PRODUCAO">Produção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        size="sm"
        className="w-full h-7 text-xs"
        disabled={saving}
        onClick={handleSave}
      >
        {saved ? (
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Salvo
          </span>
        ) : saving ? (
          'Salvando...'
        ) : (
          'Salvar'
        )}
      </Button>
    </div>
  )
}

// ─── Methods Section ──────────────────────────────────────────────────────────

function MethodsSection({
  methods,
  providers,
  onRefresh,
}: {
  methods: MethodMapping[]
  providers: ProviderSummary[]
  onRefresh: () => void
}) {
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function toggleMethod(id: string) {
    if (togglingId) return
    setTogglingId(id)
    try {
      await api.patch(`/payment-config/methods/${id}/toggle`)
      onRefresh()
    } catch {
      // no-op
    } finally {
      setTogglingId(null)
    }
  }

  const byCanal: Record<PaymentChannel, MethodMapping[]> = {
    PDV: methods.filter((m) => m.canal === 'PDV'),
    ECOMMERCE: methods.filter((m) => m.canal === 'ECOMMERCE'),
  }

  return (
    <SectionCard
      icon={Layers}
      title="Métodos de pagamento"
      action={
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      }
    >
      {methods.length === 0 ? (
        <div className="text-center py-6">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum método configurado</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar método
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {(Object.entries(byCanal) as [PaymentChannel, MethodMapping[]][]).map(
            ([canal, canalMethods]) =>
              canalMethods.length > 0 && (
                <div key={canal}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {CANAL_LABEL[canal]}
                  </p>
                  <div className="space-y-1">
                    {canalMethods.map((m) => {
                      const provider = providers.find((p) => p.id === m.provider_id)
                      const expanded = expandedId === m.id
                      return (
                        <div
                          key={m.id}
                          className="rounded-lg border border-border/60 overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <button
                              className="flex items-center gap-2 min-w-0 text-left"
                              onClick={() => setExpandedId(expanded ? null : m.id)}
                            >
                              {expanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {METODO_LABEL[m.metodo]}
                              </span>
                              {provider && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {provider.nome_exibicao}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => toggleMethod(m.id)}
                              disabled={togglingId === m.id}
                              className={cn(
                                'shrink-0 transition-colors',
                                m.ativo
                                  ? 'text-success hover:text-success/80'
                                  : 'text-muted-foreground hover:text-muted-foreground/80',
                              )}
                              title={m.ativo ? 'Desativar' : 'Ativar'}
                            >
                              {m.ativo ? (
                                <ToggleRight className="h-5 w-5" />
                              ) : (
                                <ToggleLeft className="h-5 w-5" />
                              )}
                            </button>
                          </div>

                          {expanded && (
                            <MethodFeeEditor
                              mapping={m}
                              providers={providers.filter((p) => p.ativo)}
                              onSaved={onRefresh}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      <AddMethodDialog
        open={addOpen}
        providers={providers}
        onClose={() => setAddOpen(false)}
        onSaved={onRefresh}
      />
    </SectionCard>
  )
}

function MethodFeeEditor({
  mapping,
  providers,
  onSaved,
}: {
  mapping: MethodMapping
  providers: ProviderSummary[]
  onSaved: () => void
}) {
  const [providerId, setProviderId] = useState(mapping.provider_id)
  const [taxaPct, setTaxaPct] = useState(String((mapping.taxa_percentual / 100).toFixed(2)))
  const [taxaFixed, setTaxaFixed] = useState(String((mapping.taxa_fixa_centavos / 100).toFixed(2)))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const pct = parseFloat(taxaPct.replace(',', '.'))
    const fixed = parseFloat(taxaFixed.replace(',', '.'))
    if (isNaN(pct) || isNaN(fixed)) {
      setError('Valores de taxa inválidos — use ponto como separador decimal (ex: 1.50)')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.put('/payment-config/methods', {
        canal: mapping.canal,
        metodo: mapping.metodo,
        provider_id: providerId,
        taxa_percentual: Math.round(pct * 100),
        taxa_fixa_centavos: Math.round(fixed * 100),
      })
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-border/60 bg-muted/20 px-4 py-3 space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Provedor</label>
        <Select value={providerId} onValueChange={setProviderId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome_exibicao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Taxa % (ex: 1.50)</label>
          <Input
            value={taxaPct}
            onChange={(e) => setTaxaPct(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Taxa fixa (R$)</label>
          <Input
            value={taxaFixed}
            onChange={(e) => setTaxaFixed(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={handleSave}>
        {saved ? (
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Salvo
          </span>
        ) : saving ? (
          'Salvando...'
        ) : (
          'Salvar alterações'
        )}
      </Button>
    </div>
  )
}

// ─── Tab Pagamento ────────────────────────────────────────────────────────────

function TabPagamento() {
  const [providers, setProviders] = useState<ProviderSummary[] | null>(null)
  const [channels, setChannels] = useState<ChannelConfig[] | null>(null)
  const [methods, setMethods] = useState<MethodMapping[] | null>(null)
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
      setProviders(providersRes.data)
      setChannels(channelsRes.data)
      setMethods(methodsRes.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) return <ErrorState onRetry={load} />

  return (
    <div className="space-y-4">
      <ProvidersSection providers={providers ?? []} onRefresh={load} />
      <ChannelsSection channels={channels ?? []} providers={providers ?? []} onRefresh={load} />
      <MethodsSection methods={methods ?? []} providers={providers ?? []} onRefresh={load} />
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

  useEffect(() => {
    load()
  }, [load])

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
              <h3 className="text-sm font-semibold text-foreground">{p.nome}</h3>
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

// ─── Tab Geral ────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

// ─── Tab Entregas ─────────────────────────────────────────────────────────────

function TabEntregas() {
  const [config, setConfig] = useState<DeliveryConfig | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Credential fields (write-only; never pre-filled from API)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [thresholdBrl, setThresholdBrl] = useState('')
  const [active, setActive] = useState(true)

  // Quote simulator
  const [quoteDropoff, setQuoteDropoff] = useState('')
  const [quotePhone, setQuotePhone] = useState('')
  const [quoteCartBrl, setQuoteCartBrl] = useState('')
  const [quotePickup, setQuotePickup] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data } = await api.get<DeliveryConfig>('/entregas/config')
      setConfig(data)
      setActive(data.active)
      setThresholdBrl(
        data.free_shipping_threshold_centavos != null
          ? String((data.free_shipping_threshold_centavos / 100).toFixed(2))
          : '',
      )
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        setConfig(null)
      } else {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openForm() {
    setClientId('')
    setClientSecret('')
    setCustomerId('')
    setWebhookSecret('')
    setSaveError(null)
    setShowForm(true)
  }

  async function handleSave() {
    setSaveError(null)
    setSaving(true)
    const threshold = thresholdBrl.trim()
      ? Math.round(parseFloat(thresholdBrl.replace(',', '.')) * 100)
      : null

    try {
      if (config === null) {
        // Create — all credential fields required
        if (!clientId || !clientSecret || !customerId || !webhookSecret) {
          setSaveError('Preencha todos os campos de credencial para criar a configuração.')
          setSaving(false)
          return
        }
        await api.post('/entregas/config', {
          client_id: clientId,
          client_secret: clientSecret,
          customer_id: customerId,
          webhook_secret: webhookSecret,
          free_shipping_threshold_centavos: threshold,
          active,
        })
      } else {
        // Update — send only non-empty credential fields + always threshold + active
        const body: Record<string, unknown> = { active, free_shipping_threshold_centavos: threshold }
        if (clientId) body.client_id = clientId
        if (clientSecret) body.client_secret = clientSecret
        if (customerId) body.customer_id = customerId
        if (webhookSecret) body.webhook_secret = webhookSecret
        await api.patch('/entregas/config', body)
      }
      setShowForm(false)
      await load()
    } catch {
      setSaveError('Erro ao salvar configuração. Verifique os dados e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleQuote() {
    setQuoteError(null)
    setQuoteResult(null)
    setQuoting(true)
    const cartCents = Math.round(parseFloat(quoteCartBrl.replace(',', '.')) * 100)
    if (isNaN(cartCents) || cartCents < 0) {
      setQuoteError('Total do carrinho inválido.')
      setQuoting(false)
      return
    }
    try {
      const body: Record<string, unknown> = {
        dropoff_address: quoteDropoff,
        recipient_phone: quotePhone,
        cart_total_centavos: cartCents,
      }
      if (quotePickup) body.pickup_address = quotePickup
      const { data } = await api.post<QuoteResult>('/entregas/quote', body)
      setQuoteResult(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setQuoteError(msg ?? 'Erro ao cotar frete. Verifique os dados e a configuração.')
    } finally {
      setQuoting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
      </div>
    )
  }

  if (error) return <ErrorState onRetry={load} />

  const isCreating = config === null
  const hasConfig = config != null

  return (
    <div className="space-y-4">
      {/* ── Config card ── */}
      <SectionCard
        icon={Truck}
        title="Configuração de entrega"
        action={
          hasConfig && !showForm ? (
            <Button variant="outline" size="sm" onClick={openForm}>
              Editar
            </Button>
          ) : undefined
        }
      >
        {/* Empty state */}
        {isCreating && !showForm && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma integração de entrega configurada</p>
            <Button size="sm" onClick={openForm}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Configurar entregas
            </Button>
          </div>
        )}

        {/* Config summary */}
        {hasConfig && !showForm && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs uppercase tracking-wide">
                  {config.provider === 'UBER_DIRECT' ? 'Uber Direct' : 'Frete Grátis'}
                </Badge>
                {config.active ? (
                  <Badge className="text-xs bg-success/10 text-success border-success/30">Ativo</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Atualizado em {new Date(config.updated_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Credenciais</p>
                <p className="text-xs text-muted-foreground mt-0.5">Configuradas (ocultas por segurança)</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Frete grátis a partir de</p>
                <p className="text-sm font-medium mt-0.5">
                  {config.free_shipping_threshold_centavos != null
                    ? `R$ ${(config.free_shipping_threshold_centavos / 100).toFixed(2)}`
                    : 'Desativado'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inline form */}
        {showForm && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-xs text-muted-foreground">
              {isCreating
                ? 'Preencha as credenciais do Uber Direct (painel → Developers → Apps).'
                : 'Deixe os campos de credencial em branco para manter os valores atuais.'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Client ID {isCreating && <span className="text-destructive">*</span>}</label>
                <Input
                  type="password"
                  placeholder={isCreating ? 'client_id' : '••••• (manter atual)'}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Client Secret {isCreating && <span className="text-destructive">*</span>}</label>
                <Input
                  type="password"
                  placeholder={isCreating ? 'client_secret' : '••••• (manter atual)'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Customer ID {isCreating && <span className="text-destructive">*</span>}</label>
                <Input
                  type="password"
                  placeholder={isCreating ? 'customer_id (UUID)' : '••••• (manter atual)'}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Webhook Secret {isCreating && <span className="text-destructive">*</span>}</label>
                <Input
                  type="password"
                  placeholder={isCreating ? 'webhook_secret' : '••••• (manter atual)'}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Frete grátis a partir de (R$)</label>
                <Input
                  placeholder="Ex: 150,00 — vazio para desativar"
                  value={thresholdBrl}
                  onChange={(e) => setThresholdBrl(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Status</label>
                <button
                  type="button"
                  onClick={() => setActive((v) => !v)}
                  className="flex items-center gap-2 h-8 text-xs text-foreground"
                >
                  {active ? (
                    <ToggleRight className="h-5 w-5 text-success" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  )}
                  {active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                {isCreating ? 'Criar configuração' : 'Salvar alterações'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setSaveError(null)
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Quote simulator (only when config exists and not editing) ── */}
      {hasConfig && !showForm && (
        <SectionCard icon={MapPin} title="Simulador de cotação">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-foreground">
                  Endereço de entrega <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Rua das Flores, 123 — Bairro, Cidade — SP"
                  value={quoteDropoff}
                  onChange={(e) => setQuoteDropoff(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Telefone do destinatário (E.164) <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="+5511999999999"
                  value={quotePhone}
                  onChange={(e) => setQuotePhone(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Total do carrinho (R$) <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="150,00"
                  value={quoteCartBrl}
                  onChange={(e) => setQuoteCartBrl(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-foreground">
                  Endereço de coleta (opcional — usa endereço da unidade se vazio)
                </label>
                <Input
                  placeholder="Rua da Loja, 456 — Bairro, Cidade — SP"
                  value={quotePickup}
                  onChange={(e) => setQuotePickup(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleQuote}
              disabled={quoting || !quoteDropoff || !quotePhone || !quoteCartBrl}
            >
              {quoting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Truck className="h-3.5 w-3.5 mr-1.5" />
              )}
              Cotar frete
            </Button>

            {quoteError && (
              <p className="text-xs text-destructive">{quoteError}</p>
            )}

            {quoteResult && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {quoteResult.provider === 'FRETE_GRATIS' ? 'Frete Grátis' : 'Uber Direct'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold">
                      {quoteResult.fee_centavos === 0
                        ? 'Grátis'
                        : `R$ ${(quoteResult.fee_centavos / 100).toFixed(2)}`}
                    </span>
                  </div>
                  {quoteResult.eta_seconds > 0 && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.round(quoteResult.eta_seconds / 60)} min estimados
                    </div>
                  )}
                  {quoteResult.expires_at && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Phone className="h-3.5 w-3.5" />
                      Cotação válida até{' '}
                      {new Date(quoteResult.expires_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
                {quoteResult.quote_id && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Quote ID: {quoteResult.quote_id}
                  </p>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── Webhook info (only when config exists) ── */}
      {hasConfig && !showForm && (
        <SectionCard icon={Wifi} title="Webhook Uber Direct">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Registre a URL abaixo no painel do Uber Direct (Developers → Webhooks) para receber
              atualizações de status de entrega em tempo real.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
              <code className="text-xs font-mono text-foreground break-all flex-1">
                {window.location.origin.replace(/:\d+$/, '')}/entregas/webhook/uber/
                <span className="text-muted-foreground">{'{unitId}'}</span>
              </code>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Substitua <code className="font-mono">{'{unitId}'}</code> pelo UUID da sua unidade
              (visível em Empresa → Unidades).
            </p>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function TabGeral() {
  return (
    <div className="space-y-4">
      <SectionCard icon={Cog} title="Sistema">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <Field label="Nome do sistema" value="Zoro&Kaya ERP" />
          <Field label="Fuso horário" value="America/Sao_Paulo (UTC-3)" />
          <Field label="Idioma" value="Português (Brasil)" />
          <Field label="Moeda" value="BRL — Real Brasileiro" />
          <Field label="Versão" value="1.0.0-alpha" />
        </div>
      </SectionCard>

      <SectionCard icon={Zap} title="Integrações ativas">
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
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Fiscal, pagamentos, entregas e sistema</p>
      </div>

      <Tabs defaultValue="pagamento">
        <TabsList className="mb-4">
          <TabsTrigger value="fiscal" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="entregas" className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            Entregas
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
        <TabsContent value="entregas">
          <TabEntregas />
        </TabsContent>
        <TabsContent value="geral">
          <TabGeral />
        </TabsContent>
      </Tabs>
    </div>
  )
}
