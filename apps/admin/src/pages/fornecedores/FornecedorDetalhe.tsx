import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Edit2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
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
import { maskCep, maskPhone } from '@/lib/formatters'
import { useCepLookup } from '@/hooks/useCepLookup'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Edit supplier form ───────────────────────────────────────────────────────

interface EditForm {
  razao_social: string
  nome_fantasia: string
  email: string
  phone: string
  website: string
  notes: string
  active: boolean
}

function buildEditForm(supplier: SupplierFull): EditForm {
  return {
    razao_social: supplier.razao_social,
    nome_fantasia: supplier.nome_fantasia ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    website: supplier.website ?? '',
    notes: supplier.notes ?? '',
    active: supplier.active,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDocument(doc: string): string {
  if (doc.length === 14)
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (doc.length === 11)
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return doc
}


function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: SupplierContact
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-shadow hover:shadow-[0_2px_12px_rgba(94,57,23,0.08)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-sm font-semibold text-brand-orange">
        {initials(contact.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground leading-tight">{contact.name}</p>
        {contact.role && (
          <p className="mt-0.5 text-sm text-muted-foreground">{contact.role}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {contact.email && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {maskPhone(contact.phone)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address: SupplierAddress
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-shadow hover:shadow-[0_2px_12px_rgba(94,57,23,0.08)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-sage/30 text-brand-brown">
        <MapPin className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground leading-tight">{address.label}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {address.logradouro}, {address.numero}
          {address.complemento ? `, ${address.complemento}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">
          {address.bairro} · {address.cidade}/{address.estado}
        </p>
        <p className="mt-1 text-xs text-muted-foreground font-mono">
          CEP {maskCep(address.cep)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function EmptySection({
  icon: Icon,
  label,
  hint,
  onAdd,
}: {
  icon: React.ElementType
  label: string
  hint: string
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
      <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5" />
        Adicionar
      </Button>
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

  // Edit supplier modal
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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
  const { lookup: cepLookup, loading: cepLoading, notFound: cepNotFound } = useCepLookup()
  const fornNumeroRef = useRef<HTMLInputElement>(null)

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

  // ── Edit supplier ──────────────────────────────────────────────────────────

  function openEdit() {
    if (!supplier) return
    setEditForm(buildEditForm(supplier))
    setEditError(null)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!editForm || !supplier) return
    if (!editForm.razao_social.trim()) {
      setEditError('Razão social é obrigatória.')
      return
    }
    setEditSaving(true)
    setEditError(null)
    const phoneDigits = editForm.phone.replace(/\D/g, '')
    const body: Record<string, unknown> = {
      razao_social: editForm.razao_social.trim(),
      nome_fantasia: editForm.nome_fantasia.trim() || null,
      email: editForm.email.trim() || null,
      phone: phoneDigits || null,
      website: editForm.website.trim() || null,
      notes: editForm.notes.trim() || null,
      active: editForm.active,
    }
    try {
      await api.patch(`/suppliers/${supplier.id}`, body)
      setEditOpen(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setEditError(typeof text === 'string' ? text : 'Erro ao salvar.')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Contacts ───────────────────────────────────────────────────────────────

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
        const cid = (contactModal as { mode: 'edit'; contact: SupplierContact }).contact.id
        await api.patch(`/suppliers/${id}/contacts/${cid}`, body)
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

  // ── Addresses ──────────────────────────────────────────────────────────────

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
    body.complemento = addressForm.complemento.trim() || null
    try {
      if (addressModal?.mode === 'create') {
        await api.post(`/suppliers/${id}/addresses`, body)
      } else {
        const aid = (addressModal as { mode: 'edit'; address: SupplierAddress }).address.id
        await api.patch(`/suppliers/${id}/addresses/${aid}`, body)
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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6 h-9 w-36 animate-pulse rounded-lg bg-surface-alt" />
        <div className="rounded-2xl bg-surface-alt h-48 animate-pulse mb-5" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-xl bg-surface-alt h-48 animate-pulse" />
          <div className="rounded-xl bg-surface-alt h-48 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/fornecedores')} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Fornecedores
        </Button>
        <p className="text-muted-foreground">{error ?? 'Fornecedor não encontrado.'}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Back link */}
      <button
        onClick={() => navigate('/fornecedores')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground -ml-0.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Fornecedores
      </button>

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-brand-forest text-brand-cream overflow-hidden">
        <div className="px-7 pt-7 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold text-brand-cream leading-tight">
                {supplier.razao_social}
              </h1>
              {supplier.nome_fantasia && (
                <p className="mt-1 text-brand-sage/80 text-sm">{supplier.nome_fantasia}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0 mt-1">
              <Badge
                className={cn(
                  'text-xs border-0 font-medium',
                  supplier.active
                    ? 'bg-brand-sage/25 text-brand-sage'
                    : 'bg-white/10 text-white/60',
                )}
              >
                {supplier.active ? 'Ativo' : 'Inativo'}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-brand-cream/70 hover:text-brand-cream hover:bg-white/10 border border-white/20"
                onClick={openEdit}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          </div>

          {/* Quick contact strip */}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5">
            <span className="flex items-center gap-2 text-sm text-brand-cream/70">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="font-mono text-xs">{formatDocument(supplier.document)}</span>
            </span>
            {supplier.email && (
              <span className="flex items-center gap-2 text-sm text-brand-cream/70">
                <Mail className="h-4 w-4 shrink-0" />
                {supplier.email}
              </span>
            )}
            {supplier.phone && (
              <span className="flex items-center gap-2 text-sm text-brand-cream/70">
                <Phone className="h-4 w-4 shrink-0" />
                {maskPhone(supplier.phone)}
              </span>
            )}
            {supplier.website && (
              <a
                href={supplier.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-brand-orange hover:text-brand-orange/80 transition-colors"
              >
                <Globe className="h-4 w-4 shrink-0" />
                {supplier.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>

        {/* Notes bar — only when present */}
        {supplier.notes && (
          <div className="border-t border-white/10 bg-white/5 px-7 py-4">
            <p className="text-sm text-brand-cream/60 leading-relaxed">{supplier.notes}</p>
          </div>
        )}
      </div>

      {/* ── Contacts + Addresses grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Contacts section */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10">
                <Users className="h-4 w-4 text-brand-orange" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Contatos</h2>
                <p className="text-xs text-muted-foreground">
                  {supplier.contacts.length === 0
                    ? 'Nenhum'
                    : `${supplier.contacts.length} representante${supplier.contacts.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5 h-8" onClick={openCreateContact}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>

          <div className="p-4">
            {supplier.contacts.length === 0 ? (
              <EmptySection
                icon={User}
                label="Sem representantes"
                hint="Adicione contatos para facilitar a comunicação com este fornecedor."
                onAdd={openCreateContact}
              />
            ) : (
              <div className="space-y-3">
                {supplier.contacts.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    onEdit={() => openEditContact(c)}
                    onDelete={() => handleDeleteContact(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Addresses section */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-sage/30">
                <MapPin className="h-4 w-4 text-brand-brown" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Endereços</h2>
                <p className="text-xs text-muted-foreground">
                  {supplier.addresses.length === 0
                    ? 'Nenhum'
                    : `${supplier.addresses.length} endereço${supplier.addresses.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5 h-8" onClick={openCreateAddress}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>

          <div className="p-4">
            {supplier.addresses.length === 0 ? (
              <EmptySection
                icon={MapPin}
                label="Sem endereços"
                hint="Cadastre os endereços de entrega e cobrança deste fornecedor."
                onAdd={openCreateAddress}
              />
            ) : (
              <div className="space-y-3">
                {supplier.addresses.map((a) => (
                  <AddressCard
                    key={a.id}
                    address={a}
                    onEdit={() => openEditAddress(a)}
                    onDelete={() => handleDeleteAddress(a)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Edit supplier modal ────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false) }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Editar fornecedor</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Razão Social *</label>
                <Input
                  value={editForm.razao_social}
                  onChange={(e) => setEditForm((p) => p && ({ ...p, razao_social: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nome Fantasia</label>
                <Input
                  value={editForm.nome_fantasia}
                  onChange={(e) => setEditForm((p) => p && ({ ...p, nome_fantasia: e.target.value }))}
                  placeholder="Nome fantasia opcional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">E-mail</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => p && ({ ...p, email: e.target.value }))}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Telefone</label>
                  <Input
                    value={maskPhone(editForm.phone)}
                    onChange={(e) => setEditForm((p) => p && ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Website</label>
                <Input
                  value={editForm.website}
                  onChange={(e) => setEditForm((p) => p && ({ ...p, website: e.target.value }))}
                  placeholder="https://empresa.com.br"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Observações</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => p && ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Notas internas sobre o fornecedor"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="edit-active"
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) => setEditForm((p) => p && ({ ...p, active: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="edit-active" className="text-sm font-medium text-foreground">
                  Fornecedor ativo
                </label>
              </div>
              {editError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {editError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Contact sheet ──────────────────────────────────────────────────── */}
      <Sheet
        open={contactModal !== null}
        onOpenChange={(open) => { if (!open) setContactModal(null) }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {contactModal?.mode === 'create' ? 'Novo contato' : 'Editar contato'}
            </SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: João Silva"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Cargo / Função</label>
              <Input
                value={contactForm.role}
                onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))}
                placeholder="Ex: Representante Comercial"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Telefone</label>
              <Input
                value={maskPhone(contactForm.phone)}
                onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                placeholder="(11) 99999-9999"
                maxLength={15}
              />
            </div>
            {contactError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {contactError}
              </p>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setContactModal(null)}>Cancelar</Button>
            <Button onClick={handleSaveContact} disabled={contactSaving}>
              {contactSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Address sheet ──────────────────────────────────────────────────── */}
      <Sheet
        open={addressModal !== null}
        onOpenChange={(open) => { if (!open) setAddressModal(null) }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {addressModal?.mode === 'create' ? 'Novo endereço' : 'Editar endereço'}
            </SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Rótulo *</label>
              <Input
                value={addressForm.label}
                onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="Ex: Sede, Filial SP"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium text-foreground">Logradouro *</label>
                <Input
                  value={addressForm.logradouro}
                  onChange={(e) => setAddressForm((p) => ({ ...p, logradouro: e.target.value }))}
                  placeholder="Av. Paulista"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Número *</label>
                <Input
                  ref={fornNumeroRef}
                  value={addressForm.numero}
                  onChange={(e) => setAddressForm((p) => ({ ...p, numero: e.target.value }))}
                  placeholder="1234"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Complemento</label>
              <Input
                value={addressForm.complemento}
                onChange={(e) => setAddressForm((p) => ({ ...p, complemento: e.target.value }))}
                placeholder="Sala 42, Andar 3…"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  CEP *{cepLoading && <span className="ml-1 text-xs font-normal text-muted-foreground">buscando…</span>}
                  {cepNotFound && <span className="ml-1 text-xs font-normal text-destructive">não encontrado</span>}
                </label>
                <Input
                  value={maskCep(addressForm.cep)}
                  placeholder="00000-000"
                  maxLength={9}
                  onChange={async (e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 8)
                    setAddressForm((p) => ({ ...p, cep: d }))
                    if (d.length === 8) {
                      const r = await cepLookup(d)
                      if (r) {
                        setAddressForm((p) => ({
                          ...p,
                          logradouro: p.logradouro || r.logradouro,
                          bairro: p.bairro || r.bairro,
                          cidade: p.cidade || r.localidade,
                          estado: p.estado || r.uf,
                        }))
                        fornNumeroRef.current?.focus()
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Bairro *</label>
                <Input
                  value={addressForm.bairro}
                  onChange={(e) => setAddressForm((p) => ({ ...p, bairro: e.target.value }))}
                  placeholder="Centro"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">UF *</label>
                <Input
                  value={addressForm.estado}
                  onChange={(e) =>
                    setAddressForm((p) => ({ ...p, estado: e.target.value.toUpperCase() }))
                  }
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Cidade *</label>
              <Input
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
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddressModal(null)}>Cancelar</Button>
            <Button onClick={handleSaveAddress} disabled={addressSaving}>
              {addressSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
