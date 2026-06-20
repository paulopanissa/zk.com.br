import { useCallback, useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Check, X, DollarSign, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

// ── Types ──────────────────────────────────────────────────────────────────

interface CostCenter {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
}

interface CostItem {
  id: string
  cost_center_id: string
  nome: string
  tipo: 'FIXO' | 'VARIAVEL'
  valor_centavos: number | null
  percentual_bps: number | null
  descricao: string | null
  ativo: boolean
}

interface CenterSummary {
  total_fixo_centavos: number
  total_variavel_bps: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
  return typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar'
}

function fmtBrl(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function fmtPct(bps: number) {
  return `${(bps / 100).toFixed(2).replace('.', ',')}%`
}

// ── Item form state ────────────────────────────────────────────────────────

interface ItemFormState {
  nome: string
  tipo: 'FIXO' | 'VARIAVEL'
  valor: string
  descricao: string
}

function buildItemForm(item?: CostItem): ItemFormState {
  if (!item) return { nome: '', tipo: 'FIXO', valor: '', descricao: '' }
  return {
    nome: item.nome,
    tipo: item.tipo,
    valor:
      item.tipo === 'FIXO'
        ? ((item.valor_centavos ?? 0) / 100).toFixed(2)
        : ((item.percentual_bps ?? 0) / 100).toFixed(2),
    descricao: item.descricao ?? '',
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const LIMIT = 20

type SheetState = null | { mode: 'create' } | { mode: 'edit'; center: CostCenter }

// ── Component ──────────────────────────────────────────────────────────────

export function CentroCustoPage() {
  const [centers, setCenters] = useState<CostCenter[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [sheet, setSheet] = useState<SheetState>(null)
  const [formNome, setFormNome] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [items, setItems] = useState<CostItem[]>([])
  const [summary, setSummary] = useState<CenterSummary | null>(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState('')

  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CostItem | null>(null)
  const [itemForm, setItemForm] = useState<ItemFormState>(buildItemForm())
  const [savingItem, setSavingItem] = useState(false)
  const [itemFormError, setItemFormError] = useState('')
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // ── Load centers ───────────────────────────────────────────────────────

  const loadCenters = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const { data } = await api.get<{ data: CostCenter[]; total: number }>('/cost-centers', {
        params: { page, limit: LIMIT },
      })
      setCenters(data.data)
      setTotal(data.total)
    } catch {
      setListError('Erro ao carregar centros de custo')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadCenters()
  }, [loadCenters])

  // ── Load items for current center ──────────────────────────────────────

  const loadItems = useCallback(async (centerId: string) => {
    setLoadingItems(true)
    setItemsError('')
    try {
      const [itemsRes, summaryRes] = await Promise.all([
        api.get<{ data: CostItem[] }>(`/cost-centers/${centerId}/items`),
        api.get<CenterSummary>(`/cost-centers/${centerId}/summary`),
      ])
      setItems(itemsRes.data.data)
      setSummary(summaryRes.data)
    } catch {
      setItemsError('Erro ao carregar itens')
    } finally {
      setLoadingItems(false)
    }
  }, [])

  // ── Sheet helpers ──────────────────────────────────────────────────────

  function openCreate() {
    setFormNome('')
    setFormDescricao('')
    setFormError('')
    setItems([])
    setSummary(null)
    setShowItemForm(false)
    setEditingItem(null)
    setSheet({ mode: 'create' })
  }

  function openEdit(center: CostCenter) {
    setFormNome(center.nome)
    setFormDescricao(center.descricao ?? '')
    setFormError('')
    setItemsError('')
    setShowItemForm(false)
    setEditingItem(null)
    setItemFormError('')
    setSheet({ mode: 'edit', center })
    loadItems(center.id)
  }

  function closeSheet() {
    setSheet(null)
    setFormError('')
    setItems([])
    setSummary(null)
    setShowItemForm(false)
    setEditingItem(null)
    setItemFormError('')
  }

  // ── Save center ────────────────────────────────────────────────────────

  async function saveCenter() {
    if (!formNome.trim()) {
      setFormError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (sheet?.mode === 'create') {
        await api.post('/cost-centers', {
          nome: formNome.trim(),
          descricao: formDescricao.trim() || null,
        })
        closeSheet()
        loadCenters()
      } else if (sheet?.mode === 'edit') {
        await api.patch(`/cost-centers/${sheet.center.id}`, {
          nome: formNome.trim(),
          descricao: formDescricao.trim() || null,
        })
        setCenters((prev) =>
          prev.map((c) =>
            c.id === sheet.center.id
              ? { ...c, nome: formNome.trim(), descricao: formDescricao.trim() || null }
              : c,
          ),
        )
      }
    } catch (err) {
      setFormError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle center active ───────────────────────────────────────────────

  async function toggleCenter(center: CostCenter) {
    if (togglingId) return
    setTogglingId(center.id)
    setToggleError(null)
    try {
      await api.patch(`/cost-centers/${center.id}`, { ativo: !center.ativo })
      setCenters((prev) =>
        prev.map((c) => (c.id === center.id ? { ...c, ativo: !c.ativo } : c)),
      )
    } catch {
      setToggleError('Erro ao alterar status')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Delete center ──────────────────────────────────────────────────────

  async function deleteCenter(id: string) {
    setDeletingId(id)
    setDeleteError(null)
    try {
      await api.delete(`/cost-centers/${id}`)
      setCenters((prev) => prev.filter((c) => c.id !== id))
      setTotal((t) => t - 1)
      setDeleteConfirmId(null)
      if (sheet?.mode === 'edit' && sheet.center.id === id) closeSheet()
    } catch {
      setDeleteError('Erro ao excluir centro de custo')
      setDeleteConfirmId(null)
    } finally {
      setDeletingId(null)
    }
  }

  // ── Item form helpers ──────────────────────────────────────────────────

  function startAddItem() {
    setEditingItem(null)
    setItemForm(buildItemForm())
    setItemFormError('')
    setShowItemForm(true)
  }

  function startEditItem(item: CostItem) {
    setEditingItem(item)
    setItemForm(buildItemForm(item))
    setItemFormError('')
    setShowItemForm(true)
  }

  function cancelItemForm() {
    setShowItemForm(false)
    setEditingItem(null)
    setItemFormError('')
  }

  function setIF<K extends keyof ItemFormState>(k: K, v: ItemFormState[K]) {
    setItemForm((p) => ({ ...p, [k]: v }))
  }

  // ── Save item ──────────────────────────────────────────────────────────

  async function saveItem() {
    if (sheet?.mode !== 'edit') return
    const centerId = sheet.center.id
    if (!itemForm.nome.trim()) {
      setItemFormError('Nome é obrigatório')
      return
    }
    const valorNum = Number(itemForm.valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      setItemFormError('Valor deve ser maior que zero')
      return
    }

    const payload: Record<string, unknown> = {
      nome: itemForm.nome.trim(),
      tipo: itemForm.tipo,
      descricao: itemForm.descricao.trim() || null,
    }

    if (itemForm.tipo === 'FIXO') {
      payload.valor_centavos = Math.round(valorNum * 100)
      payload.percentual_bps = null
    } else {
      payload.percentual_bps = Math.round(valorNum * 100)
      payload.valor_centavos = null
    }

    setSavingItem(true)
    setItemFormError('')
    try {
      if (editingItem) {
        const { data } = await api.patch<CostItem>(
          `/cost-centers/${centerId}/items/${editingItem.id}`,
          payload,
        )
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? data : i)))
      } else {
        const { data } = await api.post<CostItem>(`/cost-centers/${centerId}/items`, payload)
        setItems((prev) => [...prev, data])
      }
      const { data: sum } = await api.get<CenterSummary>(`/cost-centers/${centerId}/summary`)
      setSummary(sum)
      cancelItemForm()
    } catch (err) {
      setItemFormError(extractError(err))
    } finally {
      setSavingItem(false)
    }
  }

  // ── Delete item ────────────────────────────────────────────────────────

  async function deleteItem(item: CostItem) {
    if (sheet?.mode !== 'edit') return
    const centerId = sheet.center.id
    setDeletingItemId(item.id)
    setItemsError('')
    try {
      await api.delete(`/cost-centers/${centerId}/items/${item.id}`)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      const { data: sum } = await api.get<CenterSummary>(`/cost-centers/${centerId}/summary`)
      setSummary(sum)
    } catch {
      setItemsError('Erro ao excluir item')
    } finally {
      setDeletingItemId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / LIMIT)
  const sheetOpen = sheet !== null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Centro de Custo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie custos fixos e variáveis para precificação dos produtos
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo centro
        </Button>
      </div>

      {/* List error */}
      {(listError ?? toggleError ?? deleteError) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError ?? toggleError ?? deleteError}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                Criado em
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && centers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum centro de custo cadastrado.{' '}
                  <button className="text-primary hover:underline" onClick={openCreate}>
                    Criar o primeiro
                  </button>
                </td>
              </tr>
            )}
            {centers.map((center) => (
              <tr
                key={center.id}
                className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{center.nome}</p>
                    {center.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {center.descricao}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge variant={center.ativo ? 'default' : 'secondary'}>
                    {center.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                  {new Date(center.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(center)}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleCenter(center)}
                      disabled={togglingId === center.id}
                      className={cn(
                        'h-8 px-2 text-xs',
                        center.ativo
                          ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
                      )}
                      title={center.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {togglingId === center.id ? '...' : center.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    {deleteConfirmId === center.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCenter(center.id)}
                          disabled={deletingId === center.id}
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                        >
                          {deletingId === center.id ? '...' : 'Confirmar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(null)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(center.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {total} centros · página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sheet: create / edit */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {sheet?.mode === 'create' ? 'Novo Centro de Custo' : 'Editar Centro de Custo'}
            </SheetTitle>
          </SheetHeader>

          <SheetBody>
            {/* Basic info */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nome *</label>
                <Input
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Custos operacionais"
                  maxLength={120}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Descrição</label>
                <textarea
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Descreva o propósito deste centro de custo..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>

            {/* Items — only in edit mode */}
            {sheet?.mode === 'edit' && (
              <div className="mt-6 pt-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Itens de custo</h3>
                    {summary && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtBrl(summary.total_fixo_centavos)} fixo ·{' '}
                        {fmtPct(summary.total_variavel_bps)} variável
                      </p>
                    )}
                  </div>
                  {!showItemForm && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startAddItem}
                      className="gap-1.5 h-7 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </Button>
                  )}
                </div>

                {/* Item form */}
                {showItemForm && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                    <p className="text-xs font-medium text-foreground">
                      {editingItem ? 'Editar item' : 'Novo item'}
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                      <Input
                        value={itemForm.nome}
                        onChange={(e) => setIF('nome', e.target.value)}
                        placeholder="Ex: Embalagem"
                        className="h-8 text-sm"
                        maxLength={120}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                      <div className="flex gap-2">
                        {(['FIXO', 'VARIAVEL'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setIF('tipo', t)
                              setIF('valor', '')
                            }}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                              itemForm.tipo === t
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground hover:border-primary',
                            )}
                          >
                            {t === 'FIXO' ? (
                              <DollarSign className="h-3 w-3" />
                            ) : (
                              <Percent className="h-3 w-3" />
                            )}
                            {t === 'FIXO' ? 'Fixo (R$)' : 'Variável (%)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        {itemForm.tipo === 'FIXO' ? 'Valor (R$) *' : 'Percentual (%) *'}
                      </label>
                      <div className="relative">
                        {itemForm.tipo === 'FIXO' && (
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            R$
                          </span>
                        )}
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemForm.valor}
                          onChange={(e) => setIF('valor', e.target.value)}
                          className={cn('h-8 text-sm', itemForm.tipo === 'FIXO' ? 'pl-8' : 'pr-6')}
                          placeholder="0,00"
                        />
                        {itemForm.tipo === 'VARIAVEL' && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            %
                          </span>
                        )}
                      </div>
                    </div>

                    {itemFormError && (
                      <p className="text-xs text-destructive">{itemFormError}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={saveItem}
                        disabled={savingItem}
                        className="h-7 text-xs gap-1"
                      >
                        <Check className="h-3 w-3" />
                        {savingItem ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelItemForm}
                        className="h-7 text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Items list */}
                {loadingItems && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Carregando itens...
                  </p>
                )}
                {itemsError && <p className="text-xs text-destructive">{itemsError}</p>}
                {!loadingItems && items.length === 0 && !showItemForm && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum item cadastrado. Clique em Adicionar para começar.
                  </p>
                )}
                {items.length > 0 && (
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center justify-between rounded-md px-3 py-2 bg-background border border-border/60',
                          editingItem?.id === item.id && 'ring-1 ring-primary border-primary',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {item.nome}
                            </span>
                            <Badge
                              variant={item.tipo === 'FIXO' ? 'outline' : 'secondary'}
                              className="text-[10px] py-0 h-4 shrink-0"
                            >
                              {item.tipo}
                            </Badge>
                            {!item.ativo && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] py-0 h-4 shrink-0"
                              >
                                inativo
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.tipo === 'FIXO'
                              ? fmtBrl(item.valor_centavos ?? 0)
                              : fmtPct(item.percentual_bps ?? 0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditItem(item)}
                            className="h-7 w-7 p-0"
                            title="Editar item"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteItem(item)}
                            disabled={deletingItemId === item.id}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Excluir item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SheetBody>

          <SheetFooter>
            <Button variant="outline" onClick={closeSheet}>
              {sheet?.mode === 'create' ? 'Cancelar' : 'Fechar'}
            </Button>
            <Button onClick={saveCenter} disabled={saving}>
              {saving
                ? 'Salvando...'
                : sheet?.mode === 'create'
                  ? 'Criar centro'
                  : 'Salvar informações'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
