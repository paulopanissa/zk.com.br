import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Edit2, Plus, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  parent_id: string | null
  active: boolean
  depth: number
}

type ModalState =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; cat: Category }

interface FormState {
  name: string
  parent_id: string
  description: string
  active: boolean
}

const EMPTY_FORM: FormState = { name: '', parent_id: 'none', description: '', active: true }

function toForm(cat: Category): FormState {
  return {
    name: cat.name,
    parent_id: cat.parent_id ?? 'none',
    description: cat.description ?? '',
    active: cat.active,
  }
}

export function CategoriasPage() {
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<Category[]>('/categories/flat')
      .then((r) => setCats(r.data))
      .catch(() => setError('Não foi possível carregar as categorias.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const roots = cats.filter((c) => c.depth === 0)

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(cat: Category) {
    setForm(toForm(cat))
    setFormError(null)
    setModal({ mode: 'edit', cat })
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Nome é obrigatório.'); return }
    setSaving(true)
    setFormError(null)
    const body = {
      name: form.name.trim(),
      parent_id: form.parent_id === 'none' ? undefined : form.parent_id,
      description: form.description.trim() || undefined,
      active: form.active,
    }
    try {
      if (modal?.mode === 'create') {
        await api.post('/categories', body)
      } else if (modal?.mode === 'edit') {
        await api.patch(`/categories/${modal.cat.id}`, body)
      }
      setModal(null)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(typeof msg === 'string' ? msg : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Excluir categoria "${cat.name}"?`)) return
    try {
      await api.delete(`/categories/${cat.id}`)
      load()
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        alert('Não é possível excluir: a categoria possui subcategorias ou produtos vinculados.')
      } else {
        alert('Erro ao excluir. Tente novamente.')
      }
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">{cats.length} categoria{cats.length !== 1 ? 's' : ''}</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Carregando…</div>
      ) : cats.length === 0 ? (
        <EmptyState onNew={openCreate} />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">Descrição</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-strong">Status</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {cats.map((cat, i) => (
                <tr
                  key={cat.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-surface-alt/60',
                    i % 2 === 1 && 'bg-surface-alt/30',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {cat.depth > 0 && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 ml-4 shrink-0" />
                      )}
                      <Tag className={cn('h-3.5 w-3.5 shrink-0', cat.depth === 0 ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('font-medium', cat.depth === 0 ? 'text-foreground' : 'text-muted-foreground')}>{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{cat.description ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', cat.active ? 'border-brand-sage/50 bg-brand-sage/20 text-brand-brown' : 'border-border text-muted-foreground')}
                    >
                      {cat.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(cat)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(cat)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modal?.mode === 'create' ? 'Nova categoria' : 'Editar categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="cat-name" className="text-sm font-medium text-foreground">Nome *</label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Alimentação"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Categoria pai</label>
              <Select value={form.parent_id} onValueChange={(v) => setForm((p) => ({ ...p, parent_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (categoria raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (categoria raiz)</SelectItem>
                  {roots
                    .filter((r) => modal?.mode !== 'edit' || r.id !== modal.cat.id)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cat-desc" className="text-sm font-medium text-foreground">Descrição</label>
              <Input
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Opcional"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="cat-active"
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="cat-active" className="text-sm font-medium text-foreground">Ativa</label>
            </div>

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

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Tag className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="font-display text-lg font-bold text-foreground">Nenhuma categoria</p>
        <p className="text-sm text-muted-foreground mt-1">Crie a primeira para organizar os produtos.</p>
        <Button className="mt-4" onClick={onNew}>Nova categoria</Button>
      </div>
    </div>
  )
}
