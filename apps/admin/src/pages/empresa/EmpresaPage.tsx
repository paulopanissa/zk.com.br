import { useCallback, useEffect, useState } from 'react'
import { Building2, Edit2, MapPin, Phone, Mail, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { UnidadesPage } from '@/pages/unidades/UnidadesPage'

// ─── Types ────────────────────────────────────────────────────────────────────

type RegimeTributario = 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'
type Aba = 'empresa' | 'unidades'

interface CompanyEmail {
  id: string
  email: string
  tipo: string
  principal: boolean
}

interface CompanyPhone {
  id: string
  numero: string
  tipo: string
  principal: boolean
}

interface CompanyAddress {
  id: string
  tipo: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  municipio: string
  uf: string
  cep: string
  principal: boolean
}

interface CompanySettings {
  id: string
  razao_social: string
  nome_fantasia: string | null
  cnpj_cpf: string
  tipo_documento: string
  regime_tributario: RegimeTributario
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  site_url: string | null
  dpo_email: string | null
  logo_url: string | null
  emails: CompanyEmail[]
  phones: CompanyPhone[]
  addresses: CompanyAddress[]
}

interface FormState {
  razao_social: string
  nome_fantasia: string
  cnpj_cpf: string
  regime_tributario: RegimeTributario
  inscricao_estadual: string
  inscricao_municipal: string
  site_url: string
  dpo_email: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REGIME_LABEL: Record<RegimeTributario, string> = {
  SIMPLES: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
}

const ABAS = [
  { key: 'empresa' as Aba, label: 'Dados da Empresa' },
  { key: 'unidades' as Aba, label: 'Unidades' },
]

function buildForm(s?: CompanySettings): FormState {
  return {
    razao_social: s?.razao_social ?? '',
    nome_fantasia: s?.nome_fantasia ?? '',
    cnpj_cpf: s?.cnpj_cpf ?? '',
    regime_tributario: s?.regime_tributario ?? 'SIMPLES',
    inscricao_estadual: s?.inscricao_estadual ?? '',
    inscricao_municipal: s?.inscricao_municipal ?? '',
    site_url: s?.site_url ?? '',
    dpo_email: s?.dpo_email ?? '',
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function SectionCard({
  title,
  icon: Icon,
  onEdit,
  children,
}: {
  title: string
  icon: React.ElementType
  onEdit?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
        </div>
        {onEdit && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmpresaPage() {
  const [aba, setAba] = useState<Aba>('empresa')
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<FormState>(buildForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<CompanySettings | null>('/company-settings')
      .then((r) => setSettings(r.data))
      .catch(() => setError('Não foi possível carregar os dados da empresa.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openEdit() {
    setForm(buildForm(settings ?? undefined))
    setFormError(null)
    setEditOpen(true)
  }

  function patch(updates: Partial<FormState>) {
    setForm((f) => ({ ...f, ...updates }))
  }

  async function handleSave() {
    if (!form.razao_social.trim()) {
      setFormError('Razão social é obrigatória.')
      return
    }
    const cnpjDigits = form.cnpj_cpf.replace(/\D/g, '')
    if (!cnpjDigits || (cnpjDigits.length !== 11 && cnpjDigits.length !== 14)) {
      setFormError('CNPJ/CPF inválido. Informe 14 dígitos (CNPJ) ou 11 dígitos (CPF).')
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      await api.put('/company-settings', {
        razao_social: form.razao_social.trim(),
        nome_fantasia: form.nome_fantasia.trim() || undefined,
        cnpj_cpf: cnpjDigits,
        regime_tributario: form.regime_tributario,
        inscricao_estadual: form.inscricao_estadual.trim() || undefined,
        inscricao_municipal: form.inscricao_municipal.trim() || undefined,
        site_url: form.site_url.trim() || undefined,
        dpo_email: form.dpo_email.trim() || undefined,
      })
      setEditOpen(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setFormError(typeof text === 'string' ? text : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const principalAddress = settings?.addresses?.find((a) => a.principal) ?? settings?.addresses?.[0]
  const principalEmail = settings?.emails?.find((e) => e.principal) ?? settings?.emails?.[0]
  const principalPhone = settings?.phones?.find((p) => p.principal) ?? settings?.phones?.[0]

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-0">
        <h1 className="font-display text-3xl font-bold text-foreground">Empresa</h1>
        <p className="text-sm text-muted-foreground mt-1">Dados cadastrais e unidades do negócio</p>

        {/* Tabs */}
        <div className="mt-5 flex gap-1 border-b border-border">
          {ABAS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setAba(a.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                aba === a.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {aba === 'empresa' && (
          <div className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                Carregando…
              </div>
            ) : !settings ? (
              <EmptyCompany onSetup={openEdit} />
            ) : (
              <>
                {/* Dados principais */}
                <SectionCard title="Dados da Empresa" icon={Building2} onEdit={openEdit}>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                    <Field label="Razão Social" value={settings.razao_social} />
                    <Field label="Nome Fantasia" value={settings.nome_fantasia} />
                    <Field label="CNPJ / CPF" value={settings.cnpj_cpf} />
                    <Field label="Inscrição Estadual" value={settings.inscricao_estadual} />
                    <Field label="Inscrição Municipal" value={settings.inscricao_municipal} />
                    <Field label="Regime Tributário" value={REGIME_LABEL[settings.regime_tributario]} />
                  </div>
                </SectionCard>

                {/* Endereço */}
                {principalAddress ? (
                  <SectionCard title="Endereço" icon={MapPin}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                      <Field
                        label="Logradouro"
                        value={`${principalAddress.logradouro}, ${principalAddress.numero}${principalAddress.complemento ? ` — ${principalAddress.complemento}` : ''}`}
                      />
                      <Field label="Bairro" value={principalAddress.bairro} />
                      <Field label="Cidade / UF" value={`${principalAddress.municipio}, ${principalAddress.uf}`} />
                      <Field label="CEP" value={principalAddress.cep} />
                    </div>
                  </SectionCard>
                ) : null}

                {/* Contato */}
                {(principalEmail || principalPhone || settings.site_url || settings.dpo_email) ? (
                  <SectionCard title="Contato" icon={Phone}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                      {principalPhone && <Field label="Telefone" value={principalPhone.numero} />}
                      {principalEmail && <Field label="E-mail" value={principalEmail.email} />}
                      {settings.site_url && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Site</p>
                          <a
                            href={settings.site_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            {settings.site_url}
                          </a>
                        </div>
                      )}
                      {settings.dpo_email && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            E-mail DPO (LGPD)
                          </p>
                          <a
                            href={`mailto:${settings.dpo_email}`}
                            className="mt-0.5 text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {settings.dpo_email}
                          </a>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                ) : null}

                {/* All emails list */}
                {settings.emails.length > 1 && (
                  <SectionCard title="E-mails" icon={Mail}>
                    <div className="space-y-2">
                      {settings.emails.map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{e.email}</span>
                          <span className="text-xs text-muted-foreground capitalize">{e.tipo.toLowerCase()}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </div>
        )}

        {aba === 'unidades' && <UnidadesPage />}
      </div>

      {/* Edit sheet */}
      <Sheet open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {settings ? 'Editar dados da empresa' : 'Cadastrar empresa'}
            </SheetTitle>
          </SheetHeader>

          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="emp-razao" className="text-sm font-medium text-foreground">
                Razão Social *
              </label>
              <Input
                id="emp-razao"
                value={form.razao_social}
                onChange={(e) => patch({ razao_social: e.target.value })}
                placeholder="Pet Shop Exemplo Ltda"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="emp-fantasia" className="text-sm font-medium text-foreground">
                Nome Fantasia
              </label>
              <Input
                id="emp-fantasia"
                value={form.nome_fantasia}
                onChange={(e) => patch({ nome_fantasia: e.target.value })}
                placeholder="Pet Shop Exemplo"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="emp-cnpj" className="text-sm font-medium text-foreground">
                CNPJ / CPF *
              </label>
              <Input
                id="emp-cnpj"
                value={form.cnpj_cpf}
                onChange={(e) => patch({ cnpj_cpf: e.target.value })}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="emp-regime" className="text-sm font-medium text-foreground">
                Regime Tributário *
              </label>
              <select
                id="emp-regime"
                value={form.regime_tributario}
                onChange={(e) => patch({ regime_tributario: e.target.value as RegimeTributario })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="SIMPLES">Simples Nacional</option>
                <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                <option value="LUCRO_REAL">Lucro Real</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="emp-ie" className="text-sm font-medium text-foreground">
                  Inscrição Estadual
                </label>
                <Input
                  id="emp-ie"
                  value={form.inscricao_estadual}
                  onChange={(e) => patch({ inscricao_estadual: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="emp-im" className="text-sm font-medium text-foreground">
                  Inscrição Municipal
                </label>
                <Input
                  id="emp-im"
                  value={form.inscricao_municipal}
                  onChange={(e) => patch({ inscricao_municipal: e.target.value })}
                  placeholder="987654321"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="emp-site" className="text-sm font-medium text-foreground">
                Site
              </label>
              <Input
                id="emp-site"
                value={form.site_url}
                onChange={(e) => patch({ site_url: e.target.value })}
                placeholder="https://www.meusite.com.br"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="emp-dpo" className="text-sm font-medium text-foreground">
                E-mail DPO (LGPD)
              </label>
              <Input
                id="emp-dpo"
                type="email"
                value={form.dpo_email}
                onChange={(e) => patch({ dpo_email: e.target.value })}
                placeholder="dpo@empresa.com.br"
              />
            </div>

            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}
          </SheetBody>

          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyCompany({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="font-display text-lg font-bold text-foreground">Empresa não cadastrada</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Configure os dados da empresa para emissão de notas fiscais e operação do ERP.
        </p>
        <Button className="mt-4" onClick={onSetup}>
          Cadastrar empresa
        </Button>
      </div>
    </div>
  )
}
