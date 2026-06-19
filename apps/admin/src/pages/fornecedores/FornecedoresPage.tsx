import { useCallback, useEffect, useState } from 'react'
import { Edit2, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface Supplier {
  id: string
  document: string
  razao_social: string
  nome_fantasia: string | null
  email: string | null
  phone: string | null
  website: string | null
  notes: string | null
  active: boolean
}

interface SupplierPage {
  data: Supplier[]
  total: number
  page: number
  limit: number
}

type ModalState = null | { mode: 'create' } | { mode: 'edit'; supplier: Supplier }

interface FormState {
  document: string
  razao_social: string
  nome_fantasia: string
  email: string
  phone: string
  website: string
  notes: string
  active: boolean
}

const LIMIT = 20

function buildInitialForm(): FormState {
  return {
    document: '',
    razao_social: '',
    nome_fantasia: '',
    email: '',
    phone: '',
    website: '',
    notes: '',
    active: true,
  }
}

function formatDocument(doc: string): string {
  if (doc.length === 14) {
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  if (doc.length === 11) {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return doc
}

export function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<FormState>(buildInitialForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [searchName, setSearchName] = useState('')
  const [searchDoc, setSearchDoc] = useState('')

  const load = useCallback(
    (p = page, name = searchName, doc = searchDoc) => {
      setLoading(true)
      setError(null)
      const params: Record<string, unknown> = { page: p, limit: LIMIT }
      if (name.trim()) params.razao_social = name.trim()
      if (doc.trim()) params.document = doc.replace(/\D/g, '')
      api
        .get<SupplierPage>('/suppliers', { params })
        .then((r) => {
          setSuppliers(r.data.data)
          setTotal(r.data.total)
        })
        .catch(() => setError('Não foi possível carregar os fornecedores.'))
        .finally(() => setLoading(false))
    },
    [page, searchName, searchDoc],
  )

  useEffect(() => {
    load()
  }, [load])

  function handleSearch() {
    setPage(1)
    load(1, searchName, searchDoc)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function openCreate() {
    setForm(buildInitialForm())
    setFormError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(supplier: Supplier) {
    setForm({
      document: supplier.document,
      razao_social: supplier.razao_social,
      nome_fantasia: supplier.nome_fantasia ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      website: supplier.website ?? '',
      notes: supplier.notes ?? '',
      active: supplier.active,
    })
    setFormError(null)
    setModal({ mode: 'edit', supplier })
  }

  function validate(): string | null {
    const docDigits = form.document.replace(/\D/g, '')
    if (!docDigits) return 'CNPJ/CPF é obrigatório.'
    if (docDigits.length !== 11 && docDigits.length !== 14)
      return 'CNPJ deve ter 14 dígitos ou CPF 11 dígitos.'
    if (!form.razao_social.trim()) return 'Razão social é obrigatória.'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return 'E-mail inválido.'
    if (form.phone.trim() && !/^\d+$/.test(form.phone.replace(/\D/g, '')))
      return 'Telefone deve conter apenas dígitos.'
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      setFormError(validationError)
      return
    }
    setSaving(true)
    setFormError(null)

    const docDigits = form.document.replace(/\D/g, '')
    const phoneDigits = form.phone.replace(/\D/g, '')

    const body: Record<string, unknown> = {
      document: docDigits,
      razao_social: form.razao_social.trim(),
    }
    if (form.nome_fantasia.trim()) body.nome_fantasia = form.nome_fantasia.trim()
    if (form.email.trim()) body.email = form.email.trim()
    if (phoneDigits) body.phone = phoneDigits
    if (form.website.trim()) body.website = form.website.trim()
    if (form.notes.trim()) body.notes = form.notes.trim()
    if (modal?.mode === 'edit') body.active = form.active

    try {
      if (modal?.mode === 'create') {
        await api.post('/suppliers', body)
      } else {
        await api.patch(`/suppliers/${modal!.supplier.id}`, body)
      }
      setModal(null)
      load(page)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setFormError(typeof text === 'string' ? text : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(supplier: Supplier) {
    if (!confirm(`Desativar fornecedor "${supplier.razao_social}"?`)) return
    try {
      await api.delete(`/suppliers/${supplier.id}`)
      load(page)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        alert(
          `Não é possível desativar: o fornecedor possui notas fiscais vinculadas.`,
        )
      } else {
        alert('Erro ao desativar. Tente novamente.')
      }
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} fornecedor{total !== 1 ? 'es' : ''}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo fornecedor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar por nome…"
            className="pl-9"
          />
        </div>
        <Input
          value={searchDoc}
          onChange={(e) => setSearchDoc(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="CNPJ / CPF"
          className="max-w-[180px]"
        />
        <Button variant="outline" onClick={handleSearch}>
          Buscar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Carregando…
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState onNew={openCreate} />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                  Razão Social
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                  CNPJ / CPF
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong hidden md:table-cell">
                  Contato
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-strong">
                  Status
                </th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier, i) => (
                <tr
                  key={supplier.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-surface-alt/60',
                    i % 2 === 1 && 'bg-surface-alt/30',
                  )}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{supplier.razao_social}</p>
                      {supplier.nome_fantasia && (
                        <p className="text-xs text-muted-foreground">{supplier.nome_fantasia}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {formatDocument(supplier.document)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {supplier.email && <p>{supplier.email}</p>}
                      {supplier.phone && (
                        <p>{supplier.phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        supplier.active
                          ? 'border-brand-sage/50 bg-brand-sage/20 text-brand-brown'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {supplier.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(supplier)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeactivate(supplier)}
                        disabled={!supplier.active}
                        title={!supplier.active ? 'Já inativo' : 'Desativar'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {total} fornecedor{total !== 1 ? 'es' : ''}
              {totalPages > 1 && ` · página ${page} de ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null) }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {modal?.mode === 'create' ? 'Novo fornecedor' : 'Editar fornecedor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Document */}
            <div className="space-y-1.5">
              <label htmlFor="sup-document" className="text-sm font-medium text-foreground">
                CNPJ / CPF *
              </label>
              <Input
                id="sup-document"
                value={form.document}
                onChange={(e) => setForm((p) => ({ ...p, document: e.target.value }))}
                placeholder="00.000.000/0000-00"
                disabled={modal?.mode === 'edit'}
                autoFocus={modal?.mode === 'create'}
              />
            </div>

            {/* Razão Social */}
            <div className="space-y-1.5">
              <label htmlFor="sup-razao" className="text-sm font-medium text-foreground">
                Razão Social *
              </label>
              <Input
                id="sup-razao"
                value={form.razao_social}
                onChange={(e) => setForm((p) => ({ ...p, razao_social: e.target.value }))}
                placeholder="Ex: Empresa Fornecedora LTDA"
                autoFocus={modal?.mode === 'edit'}
              />
            </div>

            {/* Nome Fantasia */}
            <div className="space-y-1.5">
              <label htmlFor="sup-fantasia" className="text-sm font-medium text-foreground">
                Nome Fantasia
              </label>
              <Input
                id="sup-fantasia"
                value={form.nome_fantasia}
                onChange={(e) => setForm((p) => ({ ...p, nome_fantasia: e.target.value }))}
                placeholder="Ex: Fornecedora XYZ"
              />
            </div>

            {/* Email + Phone row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="sup-email" className="text-sm font-medium text-foreground">
                  E-mail
                </label>
                <Input
                  id="sup-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sup-phone" className="text-sm font-medium text-foreground">
                  Telefone
                </label>
                <Input
                  id="sup-phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 99999-0000"
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <label htmlFor="sup-website" className="text-sm font-medium text-foreground">
                Website
              </label>
              <Input
                id="sup-website"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://empresa.com.br"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="sup-notes" className="text-sm font-medium text-foreground">
                Observações
              </label>
              <textarea
                id="sup-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notas internas sobre o fornecedor"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {/* Active toggle (edit only) */}
            {modal?.mode === 'edit' && (
              <div className="flex items-center gap-3">
                <input
                  id="sup-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="sup-active" className="text-sm font-medium text-foreground">
                  Ativo
                </label>
              </div>
            )}

            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-5xl mb-4">🚚</p>
        <p className="font-display text-lg font-bold text-foreground">Nenhum fornecedor</p>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre fornecedores para associar às notas fiscais e produtos.
        </p>
        <Button className="mt-4" onClick={onNew}>
          Novo fornecedor
        </Button>
      </div>
    </div>
  )
}
