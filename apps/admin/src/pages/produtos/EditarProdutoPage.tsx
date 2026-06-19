import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { type Product } from './types'

interface NamedItem {
  id: string
  name: string
}

interface CategoryFlat {
  id: string
  name: string
  depth: number
}

interface BrandPage {
  data: { id: string; name: string }[]
  total: number
}

interface BasicosForm {
  name: string
  sku: string
  barcode: string
  unit: string
  min_stock: string
  featured: boolean
  category_id: string
  brand_id: string
}

interface DescricaoForm {
  short_description: string
  description: string
}

interface PrecificacaoForm {
  cost_price: string
  sale_price: string
  promotional_price: string
  discount_enabled: boolean
  max_discount_pct: string
}

type TabKey = 'basicos' | 'descricao' | 'precificacao'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basicos', label: 'Dados básicos' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'precificacao', label: 'Precificação' },
]

export function EditarProdutoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [productName, setProductName] = useState('')
  const [active, setActive] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)

  const [categorias, setCategorias] = useState<NamedItem[]>([])
  const [marcas, setMarcas] = useState<NamedItem[]>([])

  const [activeTab, setActiveTab] = useState<TabKey>('basicos')

  const [basicos, setBasicos] = useState<BasicosForm>({
    name: '',
    sku: '',
    barcode: '',
    unit: '',
    min_stock: '0',
    featured: false,
    category_id: '',
    brand_id: '',
  })
  const [descricao, setDescricao] = useState<DescricaoForm>({
    short_description: '',
    description: '',
  })
  const [precificacao, setPrecificacao] = useState<PrecificacaoForm>({
    cost_price: '',
    sale_price: '',
    promotional_price: '',
    discount_enabled: false,
    max_discount_pct: '',
  })

  const [savedTabs, setSavedTabs] = useState<Record<TabKey, boolean>>({
    basicos: false,
    descricao: false,
    precificacao: false,
  })
  const [saving, setSaving] = useState<Record<TabKey, boolean>>({
    basicos: false,
    descricao: false,
    precificacao: false,
  })
  const [tabErrors, setTabErrors] = useState<Record<TabKey, string>>({
    basicos: '',
    descricao: '',
    precificacao: '',
  })

  // Load product data + support data
  useEffect(() => {
    if (!id) return

    Promise.all([
      api.get<Product>(`/products/${id}`),
      api.get<CategoryFlat[]>('/categories/flat').catch(() => ({ data: [] as CategoryFlat[] })),
      api.get<BrandPage>('/brands', { params: { limit: 100 } }).catch(() => ({
        data: { data: [] as { id: string; name: string }[] },
      })),
    ])
      .then(([{ data: product }, { data: cats }, { data: brandsPage }]) => {
        setProductName(product.name)
        setActive(product.active)
        setCategorias((cats as CategoryFlat[]).map((c) => ({ id: c.id, name: c.name })))
        setMarcas((brandsPage as BrandPage).data.map((b) => ({ id: b.id, name: b.name })))

        setBasicos({
          name: product.name,
          sku: product.sku ?? '',
          barcode: product.barcode ?? '',
          unit: product.unit ?? '',
          min_stock: String(product.min_stock ?? 0),
          featured: product.featured,
          category_id: product.category?.id ?? '',
          brand_id: product.brand?.id ?? '',
        })
        setDescricao({
          short_description: product.short_description ?? '',
          description: product.description ?? '',
        })
        if (product.pricing) {
          setPrecificacao({
            cost_price: product.pricing.cost_price_cents
              ? String(product.pricing.cost_price_cents / 100)
              : '',
            sale_price: product.pricing.sale_price_cents
              ? String(product.pricing.sale_price_cents / 100)
              : '',
            promotional_price: product.pricing.promotional_price_cents
              ? String(product.pricing.promotional_price_cents / 100)
              : '',
            discount_enabled: false,
            max_discount_pct: '',
          })
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [id])

  function setB<K extends keyof BasicosForm>(key: K, val: BasicosForm[K]) {
    setBasicos((p) => ({ ...p, [key]: val }))
    setSavedTabs((p) => ({ ...p, basicos: false }))
  }

  function setD<K extends keyof DescricaoForm>(key: K, val: DescricaoForm[K]) {
    setDescricao((p) => ({ ...p, [key]: val }))
    setSavedTabs((p) => ({ ...p, descricao: false }))
  }

  function setP<K extends keyof PrecificacaoForm>(key: K, val: PrecificacaoForm[K]) {
    setPrecificacao((p) => ({ ...p, [key]: val }))
    setSavedTabs((p) => ({ ...p, precificacao: false }))
  }

  function setSavingTab(tab: TabKey, val: boolean) {
    setSaving((p) => ({ ...p, [tab]: val }))
  }

  function setTabError(tab: TabKey, msg: string) {
    setTabErrors((p) => ({ ...p, [tab]: msg }))
  }

  function markSaved(tab: TabKey) {
    setSavedTabs((p) => ({ ...p, [tab]: true }))
    setTabErrors((p) => ({ ...p, [tab]: '' }))
  }

  function extractApiError(err: unknown): string {
    const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data
      ?.message
    return typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar'
  }

  const saveBasicos = useCallback(async () => {
    if (!basicos.name.trim()) {
      setTabError('basicos', 'Nome é obrigatório')
      return
    }
    setSavingTab('basicos', true)
    setTabError('basicos', '')
    try {
      const payload: Record<string, unknown> = {
        name: basicos.name.trim(),
        featured: basicos.featured,
        min_stock: Math.max(0, parseInt(basicos.min_stock) || 0),
        sku: basicos.sku.trim() || null,
        barcode: basicos.barcode.trim() || null,
        unit: basicos.unit.trim() || null,
        category_id: basicos.category_id || null,
        brand_id: basicos.brand_id || null,
      }
      await api.patch(`/products/${id}`, payload)
      setProductName(basicos.name.trim())
      markSaved('basicos')
    } catch (err) {
      setTabError('basicos', extractApiError(err))
    } finally {
      setSavingTab('basicos', false)
    }
  }, [basicos, id])

  const saveDescricao = useCallback(async () => {
    setSavingTab('descricao', true)
    setTabError('descricao', '')
    try {
      await api.patch(`/products/${id}`, {
        short_description: descricao.short_description.trim() || null,
        description: descricao.description.trim() || null,
      })
      markSaved('descricao')
    } catch (err) {
      setTabError('descricao', extractApiError(err))
    } finally {
      setSavingTab('descricao', false)
    }
  }, [descricao, id])

  const savePrecificacao = useCallback(async () => {
    setSavingTab('precificacao', true)
    setTabError('precificacao', '')
    try {
      const payload: Record<string, unknown> = {
        discount_enabled: precificacao.discount_enabled,
      }
      if (precificacao.cost_price) payload.cost_price_cents = Math.round(parseFloat(precificacao.cost_price) * 100)
      if (precificacao.sale_price) payload.sale_price_cents = Math.round(parseFloat(precificacao.sale_price) * 100)
      if (precificacao.promotional_price) payload.promotional_price_cents = Math.round(parseFloat(precificacao.promotional_price) * 100)
      if (precificacao.discount_enabled && precificacao.max_discount_pct) {
        payload.max_discount_pct = parseFloat(precificacao.max_discount_pct)
      }
      await api.patch(`/products/${id}/pricing`, payload)
      markSaved('precificacao')
    } catch (err) {
      setTabError('precificacao', extractApiError(err))
    } finally {
      setSavingTab('precificacao', false)
    }
  }, [precificacao, id])

  async function toggleActive() {
    setTogglingActive(true)
    try {
      await api.patch(`/products/${id}`, { active: !active })
      setActive((a) => !a)
    } finally {
      setTogglingActive(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Não foi possível carregar o produto.</p>
        <Button variant="outline" onClick={() => navigate('/produtos')}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/produtos')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Produtos</span>
            <span>/</span>
            <span className="font-medium text-foreground">{productName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              active
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-border text-muted-foreground',
            )}
          >
            {active ? 'Ativo' : 'Inativo'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleActive}
            disabled={togglingActive}
          >
            {active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList variant="line" className="mb-6 w-full justify-start gap-6 border-b border-border pb-0">
              {TABS.map(({ key, label }) => (
                <TabsTrigger key={key} value={key} className="relative pb-3">
                  <span>{label}</span>
                  {savedTabs[key] && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                      <Check className="h-2.5 w-2.5 text-success" />
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Dados básicos */}
            <TabsContent value="basicos">
              <FormCard
                error={tabErrors.basicos}
                onSave={saveBasicos}
                saving={saving.basicos}
              >
                <FormSection title="Identificação">
                  <Field label="Nome *">
                    <Input
                      value={basicos.name}
                      onChange={(e) => setB('name', e.target.value)}
                      placeholder="Nome do produto"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="SKU">
                      <Input
                        value={basicos.sku}
                        onChange={(e) => setB('sku', e.target.value)}
                        placeholder="Ex: RC-ADULT-15KG"
                      />
                    </Field>
                    <Field label="Código de barras">
                      <Input
                        value={basicos.barcode}
                        onChange={(e) => setB('barcode', e.target.value)}
                        placeholder="EAN-8 / EAN-13 / UPC"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Unidade">
                      <Input
                        value={basicos.unit}
                        onChange={(e) => setB('unit', e.target.value)}
                        placeholder="Ex: UN, KG, L, CX"
                      />
                    </Field>
                    <Field label="Estoque mínimo">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={basicos.min_stock}
                        onChange={(e) => setB('min_stock', e.target.value)}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Classificação">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Categoria">
                      <Select
                        value={basicos.category_id || '__none__'}
                        onValueChange={(v) => setB('category_id', v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem categoria</SelectItem>
                          {categorias.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Marca">
                      <Select
                        value={basicos.brand_id || '__none__'}
                        onValueChange={(v) => setB('brand_id', v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem marca</SelectItem>
                          {marcas.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="pt-1">
                    <ToggleChip
                      label="Destaque"
                      active={basicos.featured}
                      onClick={() => setB('featured', !basicos.featured)}
                    />
                  </div>
                </FormSection>
              </FormCard>
            </TabsContent>

            {/* Descrição */}
            <TabsContent value="descricao">
              <FormCard
                error={tabErrors.descricao}
                onSave={saveDescricao}
                saving={saving.descricao}
              >
                <FormSection title="Textos">
                  <Field label="Descrição curta">
                    <Input
                      value={descricao.short_description}
                      onChange={(e) => setD('short_description', e.target.value)}
                      placeholder="Resumo para listagens e e-commerce (máx. 500 chars)"
                      maxLength={500}
                    />
                  </Field>
                  <Field label="Descrição completa">
                    <textarea
                      rows={6}
                      value={descricao.description}
                      onChange={(e) => setD('description', e.target.value)}
                      placeholder="Detalhes, composição, instruções de uso..."
                      className="flex min-h-[140px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </Field>
                </FormSection>
              </FormCard>
            </TabsContent>

            {/* Precificação */}
            <TabsContent value="precificacao">
              <FormCard
                error={tabErrors.precificacao}
                onSave={savePrecificacao}
                saving={saving.precificacao}
              >
                <FormSection title="Preços">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Custo (R$)">
                      <PriceInput
                        placeholder="0,00"
                        value={precificacao.cost_price}
                        onChange={(v) => setP('cost_price', v)}
                      />
                    </Field>
                    <Field label="Venda (R$)">
                      <PriceInput
                        placeholder="0,00"
                        value={precificacao.sale_price}
                        onChange={(v) => setP('sale_price', v)}
                      />
                    </Field>
                  </div>
                  <Field label="Preço promocional (R$)">
                    <PriceInput
                      placeholder="Opcional"
                      value={precificacao.promotional_price}
                      onChange={(v) => setP('promotional_price', v)}
                    />
                  </Field>
                </FormSection>

                <FormSection title="Desconto no PDV">
                  <div className="flex flex-wrap items-center gap-4">
                    <ToggleChip
                      label="Habilitar desconto"
                      active={precificacao.discount_enabled}
                      onClick={() => setP('discount_enabled', !precificacao.discount_enabled)}
                    />
                    {precificacao.discount_enabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Desconto máximo</span>
                        <div className="relative w-24">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="0"
                            value={precificacao.max_discount_pct}
                            onChange={(e) => setP('max_discount_pct', e.target.value)}
                            className="pr-7"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </FormSection>
              </FormCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// --- Sub-components (same as NovoProdutoPage) ---

function FormCard({
  children,
  error,
  onSave,
  saving,
}: {
  children: ReactNode
  error: string
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="px-6 py-5">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-6">{children}</div>
      </div>
      <div className="flex justify-end border-t border-border/60 px-6 py-4">
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

function PriceInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-primary-foreground' : 'bg-muted-foreground',
        )}
      />
      {label}
    </button>
  )
}
