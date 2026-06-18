import { useCallback, useEffect, useState } from 'react'
import { Edit2, Plus, Trash2, Upload, X } from 'lucide-react'
import { FileUpload } from '@ark-ui/react'
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

interface Brand {
  id: string
  name: string
  slug: string
  logo_url: string | null
  active: boolean
}

interface BrandPage {
  data: Brand[]
  total: number
  page: number
  limit: number
}

type ModalState = null | { mode: 'create' } | { mode: 'edit'; brand: Brand }

interface FormState {
  name: string
  active: boolean
  logo_url: string
  logoFile: File | null
  logoPreview: string | null
  logoRemoved: boolean
}

const LIMIT = 20

function buildInitialForm(): FormState {
  return { name: '', active: true, logo_url: '', logoFile: null, logoPreview: null, logoRemoved: false }
}

export function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<FormState>(buildInitialForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fileUploadKey, setFileUploadKey] = useState(0)

  const load = useCallback((p = page) => {
    setLoading(true)
    setError(null)
    api
      .get<BrandPage>('/brands', { params: { page: p, limit: LIMIT } })
      .then((r) => { setBrands(r.data.data); setTotal(r.data.total) })
      .catch(() => setError('Não foi possível carregar as marcas.'))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm(buildInitialForm())
    setFormError(null)
    setFileUploadKey((k) => k + 1)
    setModal({ mode: 'create' })
  }

  function openEdit(brand: Brand) {
    setForm({
      name: brand.name,
      active: brand.active,
      logo_url: brand.logo_url ?? '',
      logoFile: null,
      logoPreview: brand.logo_url ?? null,
      logoRemoved: false,
    })
    setFormError(null)
    setFileUploadKey((k) => k + 1)
    setModal({ mode: 'edit', brand })
  }

  function handleFileAccept(details: { files: File[] }) {
    const file = details.files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setForm((p) => ({ ...p, logoFile: file, logoPreview: preview, logo_url: '', logoRemoved: false }))
  }

  function clearLogo() {
    if (form.logoPreview && form.logoFile) {
      URL.revokeObjectURL(form.logoPreview)
    }
    setForm((p) => ({ ...p, logoFile: null, logoPreview: null, logo_url: '', logoRemoved: true }))
    setFileUploadKey((k) => k + 1)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Nome é obrigatório.'); return }
    setSaving(true)
    setFormError(null)

    try {
      let brandId: string

      if (modal?.mode === 'create') {
        const body: { name: string; logo_url?: string } = { name: form.name.trim() }
        if (form.logo_url.trim()) body.logo_url = form.logo_url.trim()
        const res = await api.post<Brand>('/brands', body)
        brandId = res.data.id
      } else {
        brandId = modal!.brand.id
        const body: { name?: string; active?: boolean; logo_url?: string } = {
          name: form.name.trim(),
          active: form.active,
        }
        if (form.logo_url.trim()) body.logo_url = form.logo_url.trim()
        await api.patch<Brand>(`/brands/${brandId}`, body)
      }

      // If logo was explicitly removed, delete from R2
      if (modal?.mode === 'edit' && form.logoRemoved && modal.brand.logo_url) {
        await api.delete(`/brands/${brandId}/logo`).catch(() => {})
      }

      // Upload new file if provided
      if (form.logoFile) {
        const fd = new FormData()
        fd.append('logo', form.logoFile)
        await api.post(`/brands/${brandId}/logo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      setModal(null)
      load(page)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setFormError(typeof text === 'string' ? text : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(brand: Brand) {
    if (!confirm(`Excluir marca "${brand.name}"?`)) return
    try {
      await api.delete(`/brands/${brand.id}`)
      load(page)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        alert(`Não é possível excluir: a marca tem produtos vinculados. Desative-a em vez de excluir.`)
      } else {
        alert('Erro ao excluir. Tente novamente.')
      }
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Marcas</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} marca{total !== 1 ? 's' : ''}</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova marca
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Carregando…</div>
      ) : brands.length === 0 ? (
        <EmptyState onNew={openCreate} />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">Marca</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">Slug</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-strong">Status</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {brands.map((brand, i) => (
                <tr
                  key={brand.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-surface-alt/60',
                    i % 2 === 1 && 'bg-surface-alt/30',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <LogoThumb url={brand.logo_url} name={brand.name} />
                      <span className="font-medium text-foreground">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{brand.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', brand.active ? 'border-brand-sage/50 bg-brand-sage/20 text-brand-brown' : 'border-border text-muted-foreground')}
                    >
                      {brand.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(brand)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(brand)}>
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
              {total} marca{total !== 1 ? 's' : ''}
              {totalPages > 1 && ` · página ${page} de ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brand create/edit modal */}
      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null) }}>
        <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{modal?.mode === 'create' ? 'Nova marca' : 'Editar marca'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <label htmlFor="brand-name" className="text-sm font-medium text-foreground">Nome *</label>
              <Input
                id="brand-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Royal Canin"
                autoFocus
              />
            </div>

            {/* Logo */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Logotipo</label>

              {form.logoPreview ? (
                <div className="space-y-2">
                  <div className="relative inline-flex">
                    <img
                      src={form.logoPreview}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg border border-border object-contain bg-surface-alt"
                    />
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <FileUpload.Root
                    key={fileUploadKey}
                    maxFiles={1}
                    maxFileSize={2 * 1024 * 1024}
                    accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] }}
                    onFileAccept={handleFileAccept}
                  >
                    <FileUpload.Trigger asChild>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Upload className="h-3.5 w-3.5" />
                        Trocar arquivo
                      </Button>
                    </FileUpload.Trigger>
                    <FileUpload.HiddenInput />
                  </FileUpload.Root>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileUpload.Root
                    key={fileUploadKey}
                    maxFiles={1}
                    maxFileSize={2 * 1024 * 1024}
                    accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] }}
                    onFileAccept={handleFileAccept}
                  >
                    <FileUpload.Dropzone className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-5 text-center cursor-pointer transition-colors hover:bg-surface-alt/60 data-[dragging]:border-brand-orange data-[dragging]:bg-brand-orange/5">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <FileUpload.Label className="text-sm font-medium text-foreground cursor-pointer">
                          Arraste aqui ou{' '}
                          <FileUpload.Trigger asChild>
                            <span className="text-brand-orange underline-offset-2 hover:underline cursor-pointer">clique para selecionar</span>
                          </FileUpload.Trigger>
                        </FileUpload.Label>
                        <p className="text-xs text-muted-foreground mt-0.5">PNG, SVG, JPG, WebP · máx 2 MB</p>
                      </div>
                    </FileUpload.Dropzone>
                    <FileUpload.HiddenInput />
                  </FileUpload.Root>
                  {/* URL input when no file */}
                  <Input
                    value={form.logo_url}
                    onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value, logoPreview: e.target.value || null }))}
                    placeholder="ou cole uma URL (https://...)"
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            {/* Active toggle (edit only) */}
            {modal?.mode === 'edit' && (
              <div className="flex items-center gap-3">
                <input
                  id="brand-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="brand-active" className="text-sm font-medium text-foreground">Ativa</label>
              </div>
            )}

            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
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

function LogoThumb({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-8 w-8 rounded-md border border-border object-contain bg-surface-alt shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-alt border border-border text-xs font-semibold text-muted-foreground">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-5xl mb-4">🏷️</p>
        <p className="font-display text-lg font-bold text-foreground">Nenhuma marca</p>
        <p className="text-sm text-muted-foreground mt-1">Cadastre marcas para associar aos produtos.</p>
        <Button className="mt-4" onClick={onNew}>Nova marca</Button>
      </div>
    </div>
  )
}
