import { useCallback, useEffect, useState } from 'react'
import { Building2, Edit2, MapPin, Phone, Mail, Globe, Plus, Trash2 } from 'lucide-react'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RegimeTributario = 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'
type TipoEnderecoEmpresa = 'MATRIZ' | 'CORRESPONDENCIA' | 'COBRANCA'
type TipoTelefoneEmpresa = 'COMERCIAL' | 'FINANCEIRO' | 'SUPORTE' | 'WHATSAPP' | 'OUTRO'
type TipoEmailEmpresa = 'COMERCIAL' | 'FINANCEIRO' | 'SUPORTE' | 'NFE' | 'DPO' | 'OUTRO'
type Aba = 'empresa' | 'unidades'

interface CompanyEmail {
  id: string
  email: string
  tipo: TipoEmailEmpresa
  principal: boolean
}

interface CompanyPhone {
  id: string
  numero: string
  ddi: string | null
  tipo: TipoTelefoneEmpresa
  principal: boolean
}

interface CompanyAddress {
  id: string
  tipo: TipoEnderecoEmpresa
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REGIME_LABEL: Record<RegimeTributario, string> = {
  SIMPLES: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
}

const TIPO_TELEFONE_LABEL: Record<TipoTelefoneEmpresa, string> = {
  COMERCIAL: 'Comercial',
  FINANCEIRO: 'Financeiro',
  SUPORTE: 'Suporte',
  WHATSAPP: 'WhatsApp',
  OUTRO: 'Outro',
}

const TIPO_EMAIL_LABEL: Record<TipoEmailEmpresa, string> = {
  COMERCIAL: 'Comercial',
  FINANCEIRO: 'Financeiro',
  SUPORTE: 'Suporte',
  NFE: 'NF-e',
  DPO: 'DPO',
  OUTRO: 'Outro',
}

const ABAS = [
  { key: 'empresa' as Aba, label: 'Dados da Empresa' },
  { key: 'unidades' as Aba, label: 'Unidades' },
]

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
  action,
  children,
}: {
  title: string
  icon: React.ElementType
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── EmpresaPage ──────────────────────────────────────────────────────────────

export function EmpresaPage() {
  const [aba, setAba] = useState<Aba>('empresa')
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sheet: Dados básicos
  const [editOpen, setEditOpen] = useState(false)
  const [basicForm, setBasicForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj_cpf: '',
    regime_tributario: 'SIMPLES' as RegimeTributario,
    inscricao_estadual: '',
    inscricao_municipal: '',
    site_url: '',
    dpo_email: '',
  })
  const [basicSaving, setBasicSaving] = useState(false)
  const [basicError, setBasicError] = useState<string | null>(null)

  // Sheet: Endereço
  const [addrOpen, setAddrOpen] = useState(false)
  const [addrTarget, setAddrTarget] = useState<CompanyAddress | null>(null)
  const [addrForm, setAddrForm] = useState({
    tipo: 'MATRIZ' as TipoEnderecoEmpresa,
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
    principal: true,
  })
  const [addrSaving, setAddrSaving] = useState(false)
  const [addrError, setAddrError] = useState<string | null>(null)

  // Sheet: Telefone
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [phoneTarget, setPhoneTarget] = useState<CompanyPhone | null>(null)
  const [phoneForm, setPhoneForm] = useState({
    tipo: 'COMERCIAL' as TipoTelefoneEmpresa,
    ddi: '+55',
    numero: '',
    principal: true,
  })
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Sheet: Emails
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTarget, setEmailTarget] = useState<CompanyEmail | null>(null)
  const [emailForm, setEmailForm] = useState({
    tipo: 'COMERCIAL' as TipoEmailEmpresa,
    email: '',
    principal: false,
  })
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

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

  // ── Handlers: Dados básicos ──────────────────────────────────────────────

  function openBasicEdit() {
    const s = settings
    setBasicForm({
      razao_social: s?.razao_social ?? '',
      nome_fantasia: s?.nome_fantasia ?? '',
      cnpj_cpf: s?.cnpj_cpf ?? '',
      regime_tributario: s?.regime_tributario ?? 'SIMPLES',
      inscricao_estadual: s?.inscricao_estadual ?? '',
      inscricao_municipal: s?.inscricao_municipal ?? '',
      site_url: s?.site_url ?? '',
      dpo_email: s?.dpo_email ?? '',
    })
    setBasicError(null)
    setEditOpen(true)
  }

  async function saveBasic() {
    if (!basicForm.razao_social.trim()) {
      setBasicError('Razão social é obrigatória.')
      return
    }
    const cnpjDigits = basicForm.cnpj_cpf.replace(/\D/g, '')
    if (!cnpjDigits || (cnpjDigits.length !== 11 && cnpjDigits.length !== 14)) {
      setBasicError('CNPJ/CPF inválido. Informe 14 dígitos (CNPJ) ou 11 dígitos (CPF).')
      return
    }
    setBasicSaving(true)
    setBasicError(null)
    try {
      await api.put('/company-settings', {
        razao_social: basicForm.razao_social.trim(),
        nome_fantasia: basicForm.nome_fantasia.trim() || undefined,
        cnpj_cpf: cnpjDigits,
        regime_tributario: basicForm.regime_tributario,
        inscricao_estadual: basicForm.inscricao_estadual.trim() || undefined,
        inscricao_municipal: basicForm.inscricao_municipal.trim() || undefined,
        site_url: basicForm.site_url.trim() || undefined,
        dpo_email: basicForm.dpo_email.trim() || undefined,
      })
      setEditOpen(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setBasicError(typeof text === 'string' ? text : 'Erro ao salvar.')
    } finally {
      setBasicSaving(false)
    }
  }

  // ── Handlers: Endereço ───────────────────────────────────────────────────

  function openAddrEdit(addr?: CompanyAddress) {
    setAddrTarget(addr ?? null)
    setAddrForm({
      tipo: addr?.tipo ?? 'MATRIZ',
      logradouro: addr?.logradouro ?? '',
      numero: addr?.numero ?? '',
      complemento: addr?.complemento ?? '',
      bairro: addr?.bairro ?? '',
      municipio: addr?.municipio ?? '',
      uf: addr?.uf ?? '',
      cep: addr?.cep ?? '',
      principal: addr?.principal ?? true,
    })
    setAddrError(null)
    setAddrOpen(true)
  }

  async function saveAddr() {
    const cepDigits = addrForm.cep.replace(/\D/g, '')
    if (!addrForm.logradouro.trim()) { setAddrError('Logradouro é obrigatório.'); return }
    if (!addrForm.numero.trim()) { setAddrError('Número é obrigatório.'); return }
    if (!addrForm.bairro.trim()) { setAddrError('Bairro é obrigatório.'); return }
    if (!addrForm.municipio.trim()) { setAddrError('Município é obrigatório.'); return }
    if (!addrForm.uf.trim() || addrForm.uf.trim().length !== 2) { setAddrError('UF deve ter 2 letras.'); return }
    if (cepDigits.length !== 8) { setAddrError('CEP deve ter 8 dígitos.'); return }

    setAddrSaving(true)
    setAddrError(null)
    try {
      const body = {
        tipo: addrForm.tipo,
        logradouro: addrForm.logradouro.trim(),
        numero: addrForm.numero.trim(),
        complemento: addrForm.complemento.trim() || undefined,
        bairro: addrForm.bairro.trim(),
        municipio: addrForm.municipio.trim(),
        uf: addrForm.uf.trim().toUpperCase(),
        cep: cepDigits,
        principal: addrForm.principal,
      }
      if (addrTarget) {
        await api.put(`/company-settings/addresses/${addrTarget.id}`, body)
      } else {
        await api.post('/company-settings/addresses', body)
      }
      setAddrOpen(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setAddrError(typeof text === 'string' ? text : 'Erro ao salvar.')
    } finally {
      setAddrSaving(false)
    }
  }

  // ── Handlers: Telefone ───────────────────────────────────────────────────

  function openPhoneEdit(phone?: CompanyPhone) {
    setPhoneTarget(phone ?? null)
    setPhoneForm({
      tipo: phone?.tipo ?? 'COMERCIAL',
      ddi: phone?.ddi ?? '+55',
      numero: phone?.numero ?? '',
      principal: phone?.principal ?? true,
    })
    setPhoneError(null)
    setPhoneOpen(true)
  }

  async function savePhone() {
    const digits = phoneForm.numero.replace(/\D/g, '')
    if (!digits) { setPhoneError('Número é obrigatório.'); return }

    setPhoneSaving(true)
    setPhoneError(null)
    try {
      const body = {
        tipo: phoneForm.tipo,
        ddi: phoneForm.ddi.trim() || undefined,
        numero: digits,
        principal: phoneForm.principal,
      }
      if (phoneTarget) {
        await api.put(`/company-settings/phones/${phoneTarget.id}`, body)
      } else {
        await api.post('/company-settings/phones', body)
      }
      setPhoneOpen(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setPhoneError(typeof text === 'string' ? text : 'Erro ao salvar.')
    } finally {
      setPhoneSaving(false)
    }
  }

  async function deletePhone(phone: CompanyPhone) {
    if (!confirm(`Remover telefone ${phone.numero}?`)) return
    try {
      await api.delete(`/company-settings/phones/${phone.id}`)
      load()
    } catch {
      alert('Erro ao remover telefone.')
    }
  }

  // ── Handlers: Email ──────────────────────────────────────────────────────

  function openEmailEdit(email?: CompanyEmail) {
    setEmailTarget(email ?? null)
    setEmailForm({
      tipo: email?.tipo ?? 'COMERCIAL',
      email: email?.email ?? '',
      principal: email?.principal ?? false,
    })
    setEmailError(null)
    setEmailOpen(true)
  }

  async function saveEmail() {
    if (!emailForm.email.trim()) { setEmailError('E-mail é obrigatório.'); return }

    setEmailSaving(true)
    setEmailError(null)
    try {
      const body = {
        tipo: emailForm.tipo,
        email: emailForm.email.trim(),
        principal: emailForm.principal,
      }
      if (emailTarget) {
        await api.put(`/company-settings/emails/${emailTarget.id}`, body)
      } else {
        await api.post('/company-settings/emails', body)
      }
      setEmailOpen(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setEmailError(typeof text === 'string' ? text : 'Erro ao salvar.')
    } finally {
      setEmailSaving(false)
    }
  }

  async function deleteEmail(email: CompanyEmail) {
    if (!confirm(`Remover e-mail ${email.email}?`)) return
    try {
      await api.delete(`/company-settings/emails/${email.id}`)
      load()
    } catch {
      alert('Erro ao remover e-mail.')
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const principalAddress = settings?.addresses?.find((a) => a.principal) ?? settings?.addresses?.[0]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <h1 className="font-display text-3xl font-bold text-foreground">Empresa</h1>
        <p className="text-sm text-muted-foreground mt-1">Dados cadastrais e unidades do negócio</p>

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
              <EmptyCompany onSetup={openBasicEdit} />
            ) : (
              <>
                {/* Dados principais */}
                <SectionCard
                  title="Dados da Empresa"
                  icon={Building2}
                  action={
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={openBasicEdit}>
                      <Edit2 className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  }
                >
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                    <Field label="Razão Social" value={settings.razao_social} />
                    <Field label="Nome Fantasia" value={settings.nome_fantasia} />
                    <Field label="CNPJ / CPF" value={settings.cnpj_cpf} />
                    <Field label="Inscrição Estadual" value={settings.inscricao_estadual} />
                    <Field label="Inscrição Municipal" value={settings.inscricao_municipal} />
                    <Field label="Regime Tributário" value={REGIME_LABEL[settings.regime_tributario]} />
                    {settings.site_url && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Site</p>
                        <a href={settings.site_url} target="_blank" rel="noopener noreferrer"
                          className="mt-0.5 text-sm text-primary hover:underline flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          {settings.site_url}
                        </a>
                      </div>
                    )}
                    {settings.dpo_email && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">E-mail DPO</p>
                        <a href={`mailto:${settings.dpo_email}`}
                          className="mt-0.5 text-sm text-primary hover:underline flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {settings.dpo_email}
                        </a>
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Endereço */}
                <SectionCard
                  title="Endereço"
                  icon={MapPin}
                  action={
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => openAddrEdit(principalAddress)}>
                      {principalAddress ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {principalAddress ? 'Editar' : 'Adicionar'}
                    </Button>
                  }
                >
                  {principalAddress ? (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                      <Field
                        label="Logradouro"
                        value={`${principalAddress.logradouro}, ${principalAddress.numero}${principalAddress.complemento ? ` — ${principalAddress.complemento}` : ''}`}
                      />
                      <Field label="Bairro" value={principalAddress.bairro} />
                      <Field label="Cidade / UF" value={`${principalAddress.municipio}, ${principalAddress.uf}`} />
                      <Field label="CEP" value={principalAddress.cep} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
                  )}
                </SectionCard>

                {/* Telefones */}
                <SectionCard
                  title="Telefones"
                  icon={Phone}
                  action={
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => openPhoneEdit()}>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  }
                >
                  {settings.phones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum telefone cadastrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {settings.phones.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-foreground font-medium">
                              {p.ddi ? `${p.ddi} ` : ''}{maskPhone(p.numero)}
                            </span>
                            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                              {TIPO_TELEFONE_LABEL[p.tipo]}
                            </span>
                            {p.principal && (
                              <span className="text-xs text-primary">principal</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openPhoneEdit(p)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deletePhone(p)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* E-mails */}
                <SectionCard
                  title="E-mails"
                  icon={Mail}
                  action={
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => openEmailEdit()}>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  }
                >
                  {settings.emails.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum e-mail cadastrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {settings.emails.map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-foreground font-medium">{e.email}</span>
                            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                              {TIPO_EMAIL_LABEL[e.tipo]}
                            </span>
                            {e.principal && (
                              <span className="text-xs text-primary">principal</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEmailEdit(e)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteEmail(e)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </div>
        )}

        {aba === 'unidades' && <UnidadesPage />}
      </div>

      {/* ── Sheet: Dados básicos ─────────────────────────────────────────── */}
      <Sheet open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{settings ? 'Editar dados da empresa' : 'Cadastrar empresa'}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="emp-razao" className="text-sm font-medium text-foreground">Razão Social *</label>
              <Input id="emp-razao" value={basicForm.razao_social} autoFocus
                onChange={(e) => setBasicForm((f) => ({ ...f, razao_social: e.target.value }))}
                placeholder="Pet Shop Exemplo Ltda" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="emp-fantasia" className="text-sm font-medium text-foreground">Nome Fantasia</label>
              <Input id="emp-fantasia" value={basicForm.nome_fantasia}
                onChange={(e) => setBasicForm((f) => ({ ...f, nome_fantasia: e.target.value }))}
                placeholder="Pet Shop Exemplo" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="emp-cnpj" className="text-sm font-medium text-foreground">CNPJ / CPF *</label>
              <Input id="emp-cnpj" value={basicForm.cnpj_cpf} maxLength={18}
                onChange={(e) => setBasicForm((f) => ({ ...f, cnpj_cpf: e.target.value }))}
                placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="emp-regime" className="text-sm font-medium text-foreground">Regime Tributário *</label>
              <select id="emp-regime" value={basicForm.regime_tributario}
                onChange={(e) => setBasicForm((f) => ({ ...f, regime_tributario: e.target.value as RegimeTributario }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="SIMPLES">Simples Nacional</option>
                <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                <option value="LUCRO_REAL">Lucro Real</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="emp-ie" className="text-sm font-medium text-foreground">Inscrição Estadual</label>
                <Input id="emp-ie" value={basicForm.inscricao_estadual}
                  onChange={(e) => setBasicForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                  placeholder="123456789" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="emp-im" className="text-sm font-medium text-foreground">Inscrição Municipal</label>
                <Input id="emp-im" value={basicForm.inscricao_municipal}
                  onChange={(e) => setBasicForm((f) => ({ ...f, inscricao_municipal: e.target.value }))}
                  placeholder="987654321" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="emp-site" className="text-sm font-medium text-foreground">Site</label>
              <Input id="emp-site" value={basicForm.site_url}
                onChange={(e) => setBasicForm((f) => ({ ...f, site_url: e.target.value }))}
                placeholder="https://www.meusite.com.br" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="emp-dpo" className="text-sm font-medium text-foreground">E-mail DPO (LGPD)</label>
              <Input id="emp-dpo" type="email" value={basicForm.dpo_email}
                onChange={(e) => setBasicForm((f) => ({ ...f, dpo_email: e.target.value }))}
                placeholder="dpo@empresa.com.br" />
            </div>
            {basicError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{basicError}</p>}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveBasic} disabled={basicSaving}>{basicSaving ? 'Salvando…' : 'Salvar'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Endereço ──────────────────────────────────────────────── */}
      <Sheet open={addrOpen} onOpenChange={(open) => { if (!open) setAddrOpen(false) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{addrTarget ? 'Editar endereço' : 'Adicionar endereço'}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="addr-tipo" className="text-sm font-medium text-foreground">Tipo</label>
              <select id="addr-tipo" value={addrForm.tipo}
                onChange={(e) => setAddrForm((f) => ({ ...f, tipo: e.target.value as TipoEnderecoEmpresa }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="MATRIZ">Matriz</option>
                <option value="CORRESPONDENCIA">Correspondência</option>
                <option value="COBRANCA">Cobrança</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label htmlFor="addr-cep" className="text-sm font-medium text-foreground">CEP *</label>
                <Input id="addr-cep" value={addrForm.cep} maxLength={8} placeholder="00000000"
                  onChange={(e) => setAddrForm((f) => ({ ...f, cep: e.target.value.replace(/\D/g, '').slice(0, 8) }))} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="addr-uf" className="text-sm font-medium text-foreground">UF *</label>
                <Input id="addr-uf" value={addrForm.uf} maxLength={2} placeholder="SP"
                  onChange={(e) => setAddrForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="addr-logradouro" className="text-sm font-medium text-foreground">Logradouro *</label>
              <Input id="addr-logradouro" value={addrForm.logradouro} placeholder="Rua, Av., Alameda…"
                onChange={(e) => setAddrForm((f) => ({ ...f, logradouro: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="addr-numero" className="text-sm font-medium text-foreground">Número *</label>
                <Input id="addr-numero" value={addrForm.numero} placeholder="123"
                  onChange={(e) => setAddrForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label htmlFor="addr-compl" className="text-sm font-medium text-foreground">Complemento</label>
                <Input id="addr-compl" value={addrForm.complemento} placeholder="Sala, Andar…"
                  onChange={(e) => setAddrForm((f) => ({ ...f, complemento: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="addr-bairro" className="text-sm font-medium text-foreground">Bairro *</label>
                <Input id="addr-bairro" value={addrForm.bairro} placeholder="Centro"
                  onChange={(e) => setAddrForm((f) => ({ ...f, bairro: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="addr-municipio" className="text-sm font-medium text-foreground">Município *</label>
                <Input id="addr-municipio" value={addrForm.municipio} placeholder="São Paulo"
                  onChange={(e) => setAddrForm((f) => ({ ...f, municipio: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input id="addr-principal" type="checkbox" checked={addrForm.principal}
                onChange={(e) => setAddrForm((f) => ({ ...f, principal: e.target.checked }))}
                className="h-4 w-4 rounded" />
              <label htmlFor="addr-principal" className="text-sm font-medium text-foreground">Endereço principal</label>
            </div>
            {addrError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{addrError}</p>}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddrOpen(false)}>Cancelar</Button>
            <Button onClick={saveAddr} disabled={addrSaving}>{addrSaving ? 'Salvando…' : 'Salvar'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Telefone ──────────────────────────────────────────────── */}
      <Sheet open={phoneOpen} onOpenChange={(open) => { if (!open) setPhoneOpen(false) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{phoneTarget ? 'Editar telefone' : 'Adicionar telefone'}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="phone-tipo" className="text-sm font-medium text-foreground">Tipo</label>
              <select id="phone-tipo" value={phoneForm.tipo}
                onChange={(e) => setPhoneForm((f) => ({ ...f, tipo: e.target.value as TipoTelefoneEmpresa }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {Object.entries(TIPO_TELEFONE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="phone-ddi" className="text-sm font-medium text-foreground">DDI</label>
                <Input id="phone-ddi" value={phoneForm.ddi} placeholder="+55" maxLength={5}
                  onChange={(e) => setPhoneForm((f) => ({ ...f, ddi: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label htmlFor="phone-numero" className="text-sm font-medium text-foreground">Número *</label>
                <Input id="phone-numero" value={maskPhone(phoneForm.numero)} placeholder="(11) 99999-9999" maxLength={15}
                  onChange={(e) => setPhoneForm((f) => ({ ...f, numero: e.target.value.replace(/\D/g, '') }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input id="phone-principal" type="checkbox" checked={phoneForm.principal}
                onChange={(e) => setPhoneForm((f) => ({ ...f, principal: e.target.checked }))}
                className="h-4 w-4 rounded" />
              <label htmlFor="phone-principal" className="text-sm font-medium text-foreground">Telefone principal</label>
            </div>
            {phoneError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{phoneError}</p>}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setPhoneOpen(false)}>Cancelar</Button>
            <Button onClick={savePhone} disabled={phoneSaving}>{phoneSaving ? 'Salvando…' : 'Salvar'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: E-mail ────────────────────────────────────────────────── */}
      <Sheet open={emailOpen} onOpenChange={(open) => { if (!open) setEmailOpen(false) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{emailTarget ? 'Editar e-mail' : 'Adicionar e-mail'}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email-tipo" className="text-sm font-medium text-foreground">Tipo</label>
              <select id="email-tipo" value={emailForm.tipo}
                onChange={(e) => setEmailForm((f) => ({ ...f, tipo: e.target.value as TipoEmailEmpresa }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {Object.entries(TIPO_EMAIL_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email-addr" className="text-sm font-medium text-foreground">E-mail *</label>
              <Input id="email-addr" type="email" value={emailForm.email} autoFocus
                onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contato@empresa.com.br" />
            </div>
            <div className="flex items-center gap-3">
              <input id="email-principal" type="checkbox" checked={emailForm.principal}
                onChange={(e) => setEmailForm((f) => ({ ...f, principal: e.target.checked }))}
                className="h-4 w-4 rounded" />
              <label htmlFor="email-principal" className="text-sm font-medium text-foreground">E-mail principal</label>
            </div>
            {emailError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{emailError}</p>}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button onClick={saveEmail} disabled={emailSaving}>{emailSaving ? 'Salvando…' : 'Salvar'}</Button>
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
        <Button className="mt-4" onClick={onSetup}>Cadastrar empresa</Button>
      </div>
    </div>
  )
}
