import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SupplierContact {
  id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
}

interface SupplierAddress {
  id: string
  label: string
  cep: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
}

interface SupplierFull {
  id: string
  document: string
  razao_social: string
  nome_fantasia: string | null
  email: string | null
  phone: string | null
  website: string | null
  notes: string | null
  active: boolean
  contacts: SupplierContact[]
  addresses: SupplierAddress[]
}

// ─── Contact form ─────────────────────────────────────────────────────────────

interface ContactForm {
  name: string
  role: string
  email: string
  phone: string
}

type ContactModal =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; contact: SupplierContact }

function buildContactForm(contact?: SupplierContact): ContactForm {
  return {
    name: contact?.name ?? '',
    role: contact?.role ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
  }
}

// ─── Address form ─────────────────────────────────────────────────────────────

interface AddressForm {
  label: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

type AddressModal =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; address: SupplierAddress }

function buildAddressForm(address?: SupplierAddress): AddressForm {
  return {
    label: address?.label ?? '',
    cep: address?.cep ?? '',
    logradouro: address?.logradouro ?? '',
    numero: address?.numero ?? '',
    complemento: address?.complemento ?? '',
    bairro: address?.bairro ?? '',
    cidade: address?.cidade ?? '',
    estado: address?.estado ?? '',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDocument(doc: string): string {
  if (doc.length === 14) {
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  if (doc.length === 11) {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return doc
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return phone
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function Section({
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

// ─── Main component ───────────────────────────────────────────────────────────

export function FornecedorDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [supplier, setSupplier] = useState<SupplierFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Contact modal
  const [contactModal, setContactModal] = useState<ContactModal>(null)
  const [contactForm, setContactForm] = useState<ContactForm>(buildContactForm())
  const [contactSaving, setContactSaving] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)

  // Address modal
  const [addressModal, setAddressModal] = useState<AddressModal>(null)
  const [addressForm, setAddressForm] = useState<AddressForm>(buildAddressForm())
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)

  function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    api
      .get<SupplierFull>(`/suppliers/${id}`)
      .then((r) => setSupplier(r.data))
      .catch(() => setError('Não foi possível carregar o fornecedor.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  // ── Contacts ────────────────────────────────────────────────────────────────

  function openCreateContact() {
    setContactForm(buildContactForm())
    setContactError(null)
    setContactModal({ mode: 'create' })
  }

  function openEditContact(contact: SupplierContact) {
    setContactForm(buildContactForm(contact))
    setContactError(null)
    setContactModal({ mode: 'edit', contact })
  }

  async function handleSaveContact() {
    if (!contactForm.name.trim()) {
      setContactError('Nome é obrigatório.')
      return
    }
    setContactSaving(true)
    setContactError(null)

    const phoneDigits = contactForm.phone.replace(/\D/g, '')
    const body: Record<string, unknown> = { name: contactForm.name.trim() }
    if (contactForm.role.trim()) body.role = contactForm.role.trim()
    if (contactForm.email.trim()) body.email = contactForm.email.trim()
    if (phoneDigits) body.phone = phoneDigits

    try {
      if (contactModal?.mode === 'create') {
        await api.post(`/suppliers/${id}/contacts`, body)
      } else {
        const contactId = (contactModal as { mode: 'edit'; contact: SupplierContact }).contact.id
        await api.patch(`/suppliers/${id}/contacts/${contactId}`, body)
      }
      setContactModal(null)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setContactError(typeof text === 'string' ? text : 'Erro ao salvar contato.')
    } finally {
      setContactSaving(false)
    }
  }

  async function handleDeleteContact(contact: SupplierContact) {
    if (!confirm(`Remover contato "${contact.name}"?`)) return
    try {
      await api.delete(`/suppliers/${id}/contacts/${contact.id}`)
      load()
    } catch {
      alert('Erro ao remover contato.')
    }
  }

  // ── Addresses ───────────────────────────────────────────────────────────────

  function openCreateAddress() {
    setAddressForm(buildAddressForm())
    setAddressError(null)
    setAddressModal({ mode: 'create' })
  }

  function openEditAddress(address: SupplierAddress) {
    setAddressForm(buildAddressForm(address))
    setAddressError(null)
    setAddressModal({ mode: 'edit', address })
  }

  async function handleSaveAddress() {
    const cepDigits = addressForm.cep.replace(/\D/g, '')
    if (!addressForm.label.trim()) { setAddressError('Rótulo é obrigatório.'); return }
    if (cepDigits.length !== 8) { setAddressError('CEP deve ter 8 dígitos.'); return }
    if (!addressForm.logradouro.trim()) { setAddressError('Logradouro é obrigatório.'); return }
    if (!addressForm.numero.trim()) { setAddressError('Número é obrigatório.'); return }
    if (!addressForm.bairro.trim()) { setAddressError('Bairro é obrigatório.'); return }
    if (!addressForm.cidade.trim()) { setAddressError('Cidade é obrigatória.'); return }
    if (!/^[A-Z]{2}$/.test(addressForm.estado.toUpperCase())) {
      setAddressError('Estado deve ser a sigla UF (ex: SP).')
      return
    }

    setAddressSaving(true)
    setAddressError(null)

    const body: Record<string, unknown> = {
      label: addressForm.label.trim(),
      cep: cepDigits,
      logradouro: addressForm.logradouro.trim(),
      numero: addressForm.numero.trim(),
      bairro: addressForm.bairro.trim(),
      cidade: addressForm.cidade.trim(),
      estado: addressForm.estado.toUpperCase(),
    }
    if (addressForm.complemento.trim()) body.complemento = addressForm.complemento.trim()

    try {
      if (addressModal?.mode === 'create') {
        await api.post(`/suppliers/${id}/addresses`, body)
      } else {
        const addressId = (addressModal as { mode: 'edit'; address: SupplierAddress }).address.id
        await api.patch(`/suppliers/${id}/addresses/${addressId}`, body)
      }
      setAddressModal(null)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setAddressError(typeof text === 'string' ? text : 'Erro ao salvar endereço.')
    } finally {
      setAddressSaving(false)
    }
  }

  async function handleDeleteAddress(address: SupplierAddress) {
    if (!confirm(`Remover endereço "${address.label}"?`)) return
    try {
      await api.delete(`/suppliers/${id}/addresses/${address.id}`)
      load()
    } catch {
      alert('Erro ao remover endereço.')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-muted-foreground text-sm">
        Carregando…
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/fornecedores')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <p className="text-muted-foreground">{error ?? 'Fornecedor não encontrado.'}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/fornecedores')} className="mb-3 gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Fornecedores
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{supplier.razao_social}</h1>
            {supplier.nome_fantasia && (
              <p className="text-sm text-muted-foreground mt-0.5">{supplier.nome_fantasia}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-sm mt-1',
              supplier.active
                ? 'border-brand-sage/50 bg-brand-sage/20 text-brand-brown'
                : 'border-border text-muted-foreground',
            )}
          >
            {supplier.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      {/* Main data */}
      <Section title="Dados gerais" icon={Building2}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="CNPJ / CPF" value={formatDocument(supplier.document)} />
          <Field label="E-mail" value={supplier.email} />
          <Field label="Telefone" value={supplier.phone ? formatPhone(supplier.phone) : null} />
          <Field label="Website" value={supplier.website} />
          {supplier.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observações</p>
              <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/fornecedores')}>
            <Edit2 className="h-3.5 w-3.5" />
            Editar dados gerais
          </Button>
        </div>
      </Section>

      {/* Contacts */}
      <Section
        title={`Contatos / Representantes (${supplier.contacts.length})`}
        icon={Users}
        action={
          <Button size="sm" className="gap-1.5" onClick={openCreateContact}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        }
      >
        {supplier.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum contato cadastrado.
          </p>
        ) : (
          <div className="space-y-3">
            {supplier.contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between rounded-lg border border-border bg-surface-alt/30 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{formatPhone(c.phone)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => openEditContact(c)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteContact(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Addresses */}
      <Section
        title={`Endereços (${supplier.addresses.length})`}
        icon={MapPin}
        action={
          <Button size="sm" className="gap-1.5" onClick={openCreateAddress}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        }
      >
        {supplier.addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum endereço cadastrado.
          </p>
        ) : (
          <div className="space-y-3">
            {supplier.addresses.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between rounded-lg border border-border bg-surface-alt/30 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{a.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.logradouro}, {a.numero}
                    {a.complemento ? `, ${a.complemento}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.bairro} · {a.cidade}/{a.estado} · CEP {a.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => openEditAddress(a)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteAddress(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Contact modal */}
      <Dialog
        open={contactModal !== null}
        onOpenChange={(open) => { if (!open) setContactModal(null) }}
      >
        <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {contactModal?.mode === 'create' ? 'Novo contato' : 'Editar contato'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="c-name" className="text-sm font-medium text-foreground">Nome *</label>
              <Input
                id="c-name"
                value={contactForm.name}
                onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: João Silva"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="c-role" className="text-sm font-medium text-foreground">Cargo / Função</label>
              <Input
                id="c-role"
                value={contactForm.role}
                onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))}
                placeholder="Ex: Representante Comercial"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="c-email" className="text-sm font-medium text-foreground">E-mail</label>
                <Input
                  id="c-email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="c-phone" className="text-sm font-medium text-foreground">Telefone</label>
                <Input
                  id="c-phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 99999-0000"
                />
              </div>
            </div>
            {contactError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {contactError}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setContactModal(null)}>Cancelar</Button>
              <Button onClick={handleSaveContact} disabled={contactSaving}>
                {contactSaving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Address modal */}
      <Dialog
        open={addressModal !== null}
        onOpenChange={(open) => { if (!open) setAddressModal(null) }}
      >
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {addressModal?.mode === 'create' ? 'Novo endereço' : 'Editar endereço'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="a-label" className="text-sm font-medium text-foreground">Rótulo *</label>
              <Input
                id="a-label"
                value={addressForm.label}
                onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="Ex: Sede, Filial SP"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label htmlFor="a-logradouro" className="text-sm font-medium text-foreground">Logradouro *</label>
                <Input
                  id="a-logradouro"
                  value={addressForm.logradouro}
                  onChange={(e) => setAddressForm((p) => ({ ...p, logradouro: e.target.value }))}
                  placeholder="Av. Paulista"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="a-numero" className="text-sm font-medium text-foreground">Número *</label>
                <Input
                  id="a-numero"
                  value={addressForm.numero}
                  onChange={(e) => setAddressForm((p) => ({ ...p, numero: e.target.value }))}
                  placeholder="1234"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="a-complemento" className="text-sm font-medium text-foreground">Complemento</label>
              <Input
                id="a-complemento"
                value={addressForm.complemento}
                onChange={(e) => setAddressForm((p) => ({ ...p, complemento: e.target.value }))}
                placeholder="Sala 42, Andar 3…"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="a-cep" className="text-sm font-medium text-foreground">CEP *</label>
                <Input
                  id="a-cep"
                  value={addressForm.cep}
                  onChange={(e) => setAddressForm((p) => ({ ...p, cep: e.target.value }))}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="a-bairro" className="text-sm font-medium text-foreground">Bairro *</label>
                <Input
                  id="a-bairro"
                  value={addressForm.bairro}
                  onChange={(e) => setAddressForm((p) => ({ ...p, bairro: e.target.value }))}
                  placeholder="Centro"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="a-estado" className="text-sm font-medium text-foreground">UF *</label>
                <Input
                  id="a-estado"
                  value={addressForm.estado}
                  onChange={(e) => setAddressForm((p) => ({ ...p, estado: e.target.value.toUpperCase() }))}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="a-cidade" className="text-sm font-medium text-foreground">Cidade *</label>
              <Input
                id="a-cidade"
                value={addressForm.cidade}
                onChange={(e) => setAddressForm((p) => ({ ...p, cidade: e.target.value }))}
                placeholder="São Paulo"
              />
            </div>
            {addressError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {addressError}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setAddressModal(null)}>Cancelar</Button>
              <Button onClick={handleSaveAddress} disabled={addressSaving}>
                {addressSaving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
