import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, Trash2, Check, DollarSign, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface CostCenter {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
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

// ── Item form ──────────────────────────────────────────────────────────────

interface ItemForm {
  nome: string
  tipo: 'FIXO' | 'VARIAVEL'
  valor: string
  descricao: string
}

function buildItemForm(item?: CostItem): ItemForm {
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

// ── Component ──────────────────────────────────────────────────────────────

export function EditarCentroCustoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Center
  const [center, setCenter] = useState<CostCenter | null>(null)
  const [loadingCenter, setLoadingCenter] = useState(true)
  const [centerError, setCenterError] = useState('')

  // Basic form
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // Toggle
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState('')

  // Items
  const [items, setItems] = useState<CostItem[]>([])
  const [summary, setSummary] = useState<CenterSummary | null>(null)
  const [loadingItems, setLoadingItems] = useState(true)
  const [itemsError, setItemsError] = useState('')

  // Item form
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CostItem | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(buildItemForm())
  const [savingItem, setSavingItem] = useState(false)
  const [itemFormError, setItemFormError] = useState('')
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────

  const loadCenter = useCallback(async () => {
    if (!id) return
    setLoadingCenter(true)
    setCenterError('')
    try {
      const { data } = await api.get<CostCenter>(`/cost-centers/${id}`)
      setCenter(data)
      setNome(data.nome)
      setDescricao(data.descricao ?? '')
    } catch {
      setCenterError('Centro de custo não encontrado')
    } finally {
      setLoadingCenter(false)
    }
  }, [id])

  const loadItems = useCallback(async () => {
    if (!id) return
    setLoadingItems(true)
    setItemsError('')
    try {
      const [itemsRes, summaryRes] = await Promise.all([
        api.get<{ data: CostItem[] }>(`/cost-centers/${id}/items`),
        api.get<CenterSummary>(`/cost-centers/${id}/summary`),
      ])
      setItems(itemsRes.data.data)
      setSummary(summaryRes.data)
    } catch {
      setItemsError('Erro ao carregar itens')
    } finally {
      setLoadingItems(false)
    }
  }, [id])

  useEffect(() => {
    loadCenter()
    loadItems()
  }, [loadCenter, loadItems])

  // ── Save basic info ────────────────────────────────────────────────────

  async function saveCenter() {
    if (!nome.trim()) {
      setSaveError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      await api.patch(`/cost-centers/${id}`, {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      })
      setCenter((prev) =>
        prev ? { ...prev, nome: nome.trim(), descricao: descricao.trim() || null } : prev,
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────

  async function toggleActive() {
    if (!center || toggling) return
    setToggling(true)
    setToggleError('')
    try {
      await api.patch(`/cost-centers/${id}`, { ativo: !center.ativo })
      setCenter((prev) => (prev ? { ...prev, ativo: !prev.ativo } : prev))
    } catch {
      setToggleError('Erro ao alterar status')
    } finally {
      setToggling(false)
    }
  }

  // ── Item form helpers ──────────────────────────────────────────────────

  function startAdd() {
    setEditingItem(null)
    setItemForm(buildItemForm())
    setItemFormError('')
    setShowItemForm(true)
  }

  function startEdit(item: CostItem) {
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

  function setIF<K extends keyof ItemForm>(k: K, v: ItemForm[K]) {
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

  async function deleteItem(item: CostItem) {
    if (!id) return
    setDeletingItemId(item.id)
    setItemsError('')
    try {
      await api.delete(`/cost-centers/${id}/items/${item.id}`)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      const { data: sum } = await api.get<CenterSummary>(`/cost-centers/${id}/summary`)
      setSummary(sum)
    } catch {
      setItemsError('Erro ao excluir item')
    } finally {
      setDeletingItemId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loadingCenter) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            to="/centro-custo"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Centro de Custo
          </Link>
          <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (centerError) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            to="/centro-custo"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Centro de Custo
          </Link>
        </div>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {centerError}
        </div>
        <Button variant="outline" onClick={() => navigate('/centro-custo')}>
          Voltar para lista
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/centro-custo"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Centro de Custo
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">
            {center?.nome ?? 'Editar Centro de Custo'}
          </h1>
          {center && (
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant={center.ativo ? 'default' : 'secondary'}>
                {center.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              {summary && (
                <span className="text-sm text-muted-foreground">
                  {fmtBrl(summary.total_fixo_centavos)} fixo · {fmtPct(summary.total_variavel_bps)} variável
                </span>
              )}
            </div>
          )}
        </div>
        {center && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button
              variant={center.ativo ? 'outline' : 'outline'}
              size="sm"
              onClick={toggleActive}
              disabled={toggling}
              className={cn(
                center.ativo
                  ? 'text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700'
                  : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700',
              )}
            >
              {toggling ? '...' : center.ativo ? 'Desativar' : 'Ativar'}
            </Button>
            {toggleError && <p className="text-xs text-destructive text-right">{toggleError}</p>}
          </div>
        )}
      </div>

      {/* Basic info card */}
      <div className="rounded-lg border border-border bg-card shadow-sm max-w-xl">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Informações básicas</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="nome">
                Nome <span className="text-destructive">*</span>
              </label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Custos operacionais"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="descricao">
                Descrição
              </label>
              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o propósito deste centro de custo..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {saveError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-border/60 px-6 py-4">
          <Button onClick={saveCenter} disabled={saving}>
            {saving ? 'Salvando...' : saved ? '✓ Salvo' : 'Salvar informações'}
          </Button>
        </div>
      </div>

      {/* Items card */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Itens de custo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defina os custos fixos (em R$) e variáveis (em %) que compõem este centro
            </p>
          </div>
          {!showItemForm && (
            <Button size="sm" variant="outline" onClick={startAdd} className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Adicionar item
            </Button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Item form */}
          {showItemForm && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <p className="text-sm font-medium text-foreground">
                {editingItem ? 'Editar item' : 'Novo item'}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nome *</label>
                  <Input
                    value={itemForm.nome}
                    onChange={(e) => setIF('nome', e.target.value)}
                    placeholder="Ex: Embalagem, Frete unitário"
                    maxLength={120}
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Tipo</label>
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
                          'flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors flex-1 justify-center',
                          itemForm.tipo === t
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
                        )}
                      >
                        {t === 'FIXO' ? (
                          <DollarSign className="h-3.5 w-3.5" />
                        ) : (
                          <Percent className="h-3.5 w-3.5" />
                        )}
                        {t === 'FIXO' ? 'Fixo (R$)' : 'Variável (%)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="max-w-xs space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {itemForm.tipo === 'FIXO' ? 'Valor (R$) *' : 'Percentual (%) *'}
                </label>
                <div className="relative">
                  {itemForm.tipo === 'FIXO' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      R$
                    </span>
                  )}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.valor}
                    onChange={(e) => setIF('valor', e.target.value)}
                    className={cn(itemForm.tipo === 'FIXO' ? 'pl-9' : 'pr-8')}
                    placeholder="0,00"
                  />
                  {itemForm.tipo === 'VARIAVEL' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      %
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {itemForm.tipo === 'FIXO'
                    ? 'Valor fixo adicionado ao custo de cada produto'
                    : 'Percentual do custo base do produto'}
                </p>
              </div>

              {itemFormError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {itemFormError}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={saveItem} disabled={savingItem} className="gap-2">
                  <Check className="h-3.5 w-3.5" />
                  {savingItem ? 'Salvando...' : editingItem ? 'Salvar alterações' : 'Adicionar item'}
                </Button>
                <Button variant="outline" onClick={cancelItemForm}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Items list */}
          {loadingItems && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {itemsError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {itemsError}
            </div>
          )}

          {!loadingItems && items.length === 0 && !showItemForm && (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-foreground">Nenhum item cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione custos fixos (embalagem, etiqueta) e variáveis (frete, taxa) para usar na
                calculadora de preço.
              </p>
              <Button variant="outline" size="sm" onClick={startAdd} className="mt-4 gap-2">
                <Plus className="h-3.5 w-3.5" />
                Adicionar primeiro item
              </Button>
            </div>
          )}

          {items.length > 0 && (
            <div className="divide-y divide-border/60 rounded-lg border border-border overflow-hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 bg-background transition-colors hover:bg-muted/20',
                    editingItem?.id === item.id && 'bg-primary/5',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {item.nome}
                      </span>
                      <Badge
                        variant={item.tipo === 'FIXO' ? 'outline' : 'secondary'}
                        className="text-[10px] py-0 h-4 shrink-0"
                      >
                        {item.tipo}
                      </Badge>
                      {!item.ativo && (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">
                          inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.tipo === 'FIXO'
                        ? fmtBrl(item.valor_centavos ?? 0)
                        : fmtPct(item.percentual_bps ?? 0)}
                      {item.descricao && (
                        <span className="text-xs ml-2 text-muted-foreground/60">
                          · {item.descricao}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(item)}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteItem(item)}
                      disabled={deletingItemId === item.id}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary footer */}
          {summary && items.length > 0 && (
            <div className="flex items-center gap-6 pt-2 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground">Total fixo</p>
                <p className="text-sm font-semibold text-foreground">
                  {fmtBrl(summary.total_fixo_centavos)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total variável</p>
                <p className="text-sm font-semibold text-foreground">
                  {fmtPct(summary.total_variavel_bps)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground ml-auto">
                {items.filter((i) => i.ativo).length} de {items.length} itens ativos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
