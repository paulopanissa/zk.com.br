import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CircleDollarSign, DollarSign, Edit2, ListChecks, Percent, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  buildItemForm,
  extractError,
  fmtBrl,
  fmtPct,
  type CenterSummary,
  type CostCenter,
  type CostItem,
  type ItemFormState,
} from './utils'

export function EditarCentroCustoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [center, setCenter] = useState<CostCenter | null>(null)
  const [loadingCenter, setLoadingCenter] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [items, setItems] = useState<CostItem[]>([])
  const [summary, setSummary] = useState<CenterSummary | null>(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState('')

  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CostItem | null>(null)
  const [itemForm, setItemForm] = useState<ItemFormState>(buildItemForm())
  const [savingItem, setSavingItem] = useState(false)
  const [itemFormError, setItemFormError] = useState('')

  const [deleteItemTarget, setDeleteItemTarget] = useState<CostItem | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current)
    }
  }, [])

  // ── Load ───────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!id) return
    setLoadingCenter(true)
    api
      .get<CostCenter>(`/cost-centers/${id}`)
      .then(({ data }) => {
        setCenter(data)
        setNome(data.nome)
        setDescricao(data.descricao ?? '')
        loadItems(id)
      })
      .catch(() => {
        setLoadError('Centro de custo não encontrado')
        navigate('/centro-custo', { replace: true })
      })
      .finally(() => setLoadingCenter(false))
  }, [id, loadItems, navigate])

  // ── Save center ────────────────────────────────────────────────────────

  async function saveCenter() {
    if (!nome.trim()) {
      setSaveError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      await api.patch(`/cost-centers/${id}`, {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      })
      setCenter((prev) =>
        prev ? { ...prev, nome: nome.trim(), descricao: descricao.trim() || null } : prev,
      )
      setSaveSuccess(true)
      saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(extractError(err))
    } finally {
      setSaving(false)
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
    if (!id) return
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
          `/cost-centers/${id}/items/${editingItem.id}`,
          payload,
        )
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? data : i)))
      } else {
        const { data } = await api.post<CostItem>(`/cost-centers/${id}/items`, payload)
        setItems((prev) => [...prev, data])
      }
      const { data: sum } = await api.get<CenterSummary>(`/cost-centers/${id}/summary`)
      setSummary(sum)
      cancelItemForm()
    } catch (err) {
      setItemFormError(extractError(err))
    } finally {
      setSavingItem(false)
    }
  }

  // ── Delete item ────────────────────────────────────────────────────────

  async function confirmDeleteItem() {
    if (!id || !deleteItemTarget) return
    setDeletingItemId(deleteItemTarget.id)
    setItemsError('')
    try {
      await api.delete(`/cost-centers/${id}/items/${deleteItemTarget.id}`)
      setItems((prev) => prev.filter((i) => i.id !== deleteItemTarget.id))
      const { data: sum } = await api.get<CenterSummary>(`/cost-centers/${id}/summary`)
      setSummary(sum)
      setDeleteItemTarget(null)
    } catch {
      setItemsError('Erro ao excluir item')
      setDeleteItemTarget(null)
    } finally {
      setDeletingItemId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loadingCenter) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando...
      </div>
    )
  }

  if (loadError || !center) {
    return null
  }

  return (
    <div className="p-6 space-y-5">
      {/* Back + page title */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/centro-custo')}
          className="gap-1.5 text-muted-foreground -ml-2 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Centros de custo
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">{center.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edite as informações e gerencie os itens de custo
        </p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Center info card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <CircleDollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground">Informações</span>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome <span className="text-destructive">*</span>
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Custos operacionais"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Descrição{' '}
                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o propósito deste centro de custo..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            {saveSuccess && (
              <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                Informações salvas com sucesso
              </p>
            )}
          </div>

          <div className="border-t border-border bg-muted/20 px-6 py-4">
            <Button onClick={saveCenter} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar informações'}
            </Button>
          </div>
        </div>

        {/* Items card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground">Itens de custo</span>
            {summary && (
              <div className="ml-auto flex items-center gap-2">
                {summary.total_fixo_centavos > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    {fmtBrl(summary.total_fixo_centavos)}
                  </span>
                )}
                {summary.total_variavel_bps > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    <Percent className="h-3 w-3 text-muted-foreground" />
                    {fmtPct(summary.total_variavel_bps)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Inline item form — no nested card, uses a muted band */}
          {showItemForm && (
            <div className="border-b border-border bg-muted/20 px-4 py-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">
                {editingItem ? 'Editar item' : 'Novo item'}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Nome <span className="text-destructive">*</span>
                </label>
                <Input
                  value={itemForm.nome}
                  onChange={(e) => setIF('nome', e.target.value)}
                  placeholder="Ex: Embalagem"
                  className="h-9 text-sm"
                  maxLength={120}
                  autoFocus
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
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
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
                  {itemForm.tipo === 'FIXO' ? 'Valor (R$)' : 'Percentual (%)'}{' '}
                  <span className="text-destructive">*</span>
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
                    className={cn('h-9 text-sm', itemForm.tipo === 'FIXO' ? 'pl-8' : 'pr-6')}
                    placeholder="0,00"
                  />
                  {itemForm.tipo === 'VARIAVEL' && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      %
                    </span>
                  )}
                </div>
              </div>

              {itemFormError && <p className="text-xs text-destructive">{itemFormError}</p>}

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={saveItem} disabled={savingItem} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  {savingItem ? 'Salvando...' : 'Salvar item'}
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelItemForm}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Items list — no nested card borders, clean dividers */}
          {loadingItems && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Carregando itens...
            </p>
          )}
          {itemsError && (
            <p className="px-4 py-3 text-sm text-destructive border-b border-border">
              {itemsError}
            </p>
          )}
          {!loadingItems && items.length === 0 && !showItemForm && (
            <div className="px-4 py-10 flex flex-col items-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <ListChecks className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nenhum item adicionado</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Adicione custos fixos (R$) ou variáveis (%) a este centro.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={startAddItem} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Adicionar item
              </Button>
            </div>
          )}
          {items.length > 0 && (
            <>
              {items.map((item, i) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors',
                    i > 0 && 'border-t border-border/40',
                    editingItem?.id === item.id && 'bg-primary/5',
                  )}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {item.tipo === 'FIXO' ? (
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.nome}
                        </span>
                        {!item.ativo && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">
                            inativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.tipo === 'FIXO'
                          ? fmtBrl(item.valor_centavos ?? 0)
                          : fmtPct(item.percentual_bps ?? 0)}{' '}
                        <span className="text-muted-foreground/60">·</span>{' '}
                        {item.tipo === 'FIXO' ? 'fixo' : 'variável'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditItem(item)}
                      className="h-8 w-8 p-0"
                      title="Editar item"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteItemTarget(item)}
                      disabled={deletingItemId === item.id}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Excluir item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {/* Add item footer */}
              {!showItemForm && (
                <div className="border-t border-border/40 px-4 py-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={startAddItem}
                    className="gap-1.5 text-muted-foreground hover:text-foreground h-8"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar item
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete item confirmation dialog */}
      <Dialog
        open={deleteItemTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItemTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir item de custo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{' '}
              <span className="font-medium text-foreground">{deleteItemTarget?.nome}</span>? Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteItem}
              disabled={deletingItemId !== null}
            >
              {deletingItemId ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
