import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Image, Package, Sparkles, Upload } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  CharCount,
  extractApiError,
  Field,
  FormCard,
  FormSection,
  ORIGENS,
  PriceInput,
  PricingCalculator,
  ToggleChip,
} from './components/ProdutoFormShared'

interface NamedItem { id: string; name: string }
interface CategoryFlat { id: string; name: string; depth: number }
interface BrandPage { data: { id: string; name: string }[]; total: number }

interface BasicosForm {
  name: string; sku: string; barcode: string; unit: string
  min_stock: string; featured: boolean; category_id: string; brand_id: string
}

interface DescricaoForm { short_description: string; description: string }

interface PrecificacaoForm {
  cost_price: string; sale_price: string; promotional_price: string
  discount_enabled: boolean; max_discount_pct: string
}

interface EntregaForm {
  weight_grams: string; height_cm: string; width_cm: string; depth_cm: string
  free_shipping: boolean; ships_from_store: boolean
}

interface FiscalForm {
  ncm: string; cfop: string; cest: string; origem: string
  regime: 'cst' | 'csosn'; cst_icms: string; csosn: string
  cst_pis: string; cst_cofins: string; cst_ipi: string
  aliquota_icms: string; aliquota_pis: string; aliquota_cofins: string; aliquota_ipi: string
}

interface SeoForm {
  seo_title: string; seo_description: string
  seo_keywords: string; schema_org_json: string
}

type TabKey = 'basicos' | 'descricao' | 'entrega' | 'fiscal' | 'seo' | 'midia'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basicos',   label: 'Básicos' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'entrega',   label: 'Entrega' },
  { key: 'fiscal',    label: 'Fiscal' },
  { key: 'seo',       label: 'SEO' },
  { key: 'midia',     label: 'Mídia' },
]

const EMPTY_RECORD = <T,>(val: T): Record<TabKey, T> => ({
  basicos: val, descricao: val, entrega: val, fiscal: val, seo: val, midia: val,
})

const EMPTY_BASICOS: BasicosForm = { name: '', sku: '', barcode: '', unit: '', min_stock: '0', featured: false, category_id: '', brand_id: '' }
const EMPTY_DESCRICAO: DescricaoForm = { short_description: '', description: '' }
const EMPTY_PRECO: PrecificacaoForm = { cost_price: '', sale_price: '', promotional_price: '', discount_enabled: false, max_discount_pct: '' }
const EMPTY_ENTREGA: EntregaForm = { weight_grams: '', height_cm: '', width_cm: '', depth_cm: '', free_shipping: false, ships_from_store: false }
const EMPTY_FISCAL: FiscalForm = { ncm: '', cfop: '', cest: '', origem: '', regime: 'cst', cst_icms: '', csosn: '', cst_pis: '', cst_cofins: '', cst_ipi: '', aliquota_icms: '', aliquota_pis: '', aliquota_cofins: '', aliquota_ipi: '' }
const EMPTY_SEO: SeoForm = { seo_title: '', seo_description: '', seo_keywords: '', schema_org_json: '' }

export function NovoProdutoPage() {
  const navigate = useNavigate()

  const [categorias, setCategorias] = useState<NamedItem[]>([])
  const [marcas, setMarcas] = useState<NamedItem[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('basicos')
  const [productId, setProductId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)

  const [basicos, setBasicos] = useState<BasicosForm>(EMPTY_BASICOS)
  const [descricao, setDescricao] = useState<DescricaoForm>(EMPTY_DESCRICAO)
  const [precificacao, setPrecificacao] = useState<PrecificacaoForm>(EMPTY_PRECO)
  const [entrega, setEntrega] = useState<EntregaForm>(EMPTY_ENTREGA)
  const [fiscal, setFiscal] = useState<FiscalForm>(EMPTY_FISCAL)
  const [seo, setSeo] = useState<SeoForm>(EMPTY_SEO)

  const [savedTabs, setSavedTabs] = useState<Record<TabKey, boolean>>(EMPTY_RECORD(false))
  const [saving, setSaving] = useState<Record<TabKey, boolean>>(EMPTY_RECORD(false))
  const [tabErrors, setTabErrors] = useState<Record<TabKey, string>>(EMPTY_RECORD(''))

  const [savingPricing, setSavingPricing] = useState(false)
  const [pricingError, setPricingError] = useState('')
  const [pricingSaved, setPricingSaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [generatingSeo, setGeneratingSeo] = useState(false)
  const [seoQueued, setSeoQueued] = useState(false)

  useEffect(() => {
    api.get<CategoryFlat[]>('/categories/flat')
      .then((r) => setCategorias(r.data.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {})
    api.get<BrandPage>('/brands', { params: { limit: 100 } })
      .then((r) => setMarcas(r.data.data.map((b) => ({ id: b.id, name: b.name }))))
      .catch(() => {})
  }, [])

  function setB<K extends keyof BasicosForm>(k: K, v: BasicosForm[K]) { setBasicos((p) => ({ ...p, [k]: v })); setSavedTabs((p) => ({ ...p, basicos: false })) }
  function setD<K extends keyof DescricaoForm>(k: K, v: DescricaoForm[K]) { setDescricao((p) => ({ ...p, [k]: v })); setSavedTabs((p) => ({ ...p, descricao: false })) }
  function setP<K extends keyof PrecificacaoForm>(k: K, v: PrecificacaoForm[K]) { setPrecificacao((p) => ({ ...p, [k]: v })); setPricingSaved(false) }
  function setE<K extends keyof EntregaForm>(k: K, v: EntregaForm[K]) { setEntrega((p) => ({ ...p, [k]: v })); setSavedTabs((p) => ({ ...p, entrega: false })) }
  function setF<K extends keyof FiscalForm>(k: K, v: FiscalForm[K]) { setFiscal((p) => ({ ...p, [k]: v })); setSavedTabs((p) => ({ ...p, fiscal: false })) }
  function setS<K extends keyof SeoForm>(k: K, v: SeoForm[K]) { setSeo((p) => ({ ...p, [k]: v })); setSavedTabs((p) => ({ ...p, seo: false })) }

  function markSaved(tab: TabKey) {
    setSavedTabs((p) => ({ ...p, [tab]: true }))
    setTabErrors((p) => ({ ...p, [tab]: '' }))
  }

  const saveBasicos = useCallback(async () => {
    if (!basicos.name.trim()) { setTabErrors((p) => ({ ...p, basicos: 'Nome é obrigatório' })); return }
    setSaving((p) => ({ ...p, basicos: true }))
    setTabErrors((p) => ({ ...p, basicos: '' }))
    try {
      const payload: Record<string, unknown> = {
        name: basicos.name.trim(), featured: basicos.featured,
        min_stock: Math.max(0, parseInt(basicos.min_stock) || 0), active: false,
      }
      if (basicos.sku.trim()) payload.sku = basicos.sku.trim()
      if (basicos.barcode.trim()) payload.barcode = basicos.barcode.trim()
      if (basicos.unit.trim()) payload.unit = basicos.unit.trim()
      if (basicos.category_id) payload.category_id = basicos.category_id
      if (basicos.brand_id) payload.brand_id = basicos.brand_id
      if (!productId) {
        const { data } = await api.post<{ id: string }>('/products', payload)
        setProductId(data.id)
      } else {
        await api.patch(`/products/${productId}`, payload)
      }
      markSaved('basicos')
    } catch (err) {
      setTabErrors((p) => ({ ...p, basicos: extractApiError(err) }))
    } finally {
      setSaving((p) => ({ ...p, basicos: false }))
    }
  }, [basicos, productId])

  const saveDescricao = useCallback(async () => {
    if (!productId) return
    setSaving((p) => ({ ...p, descricao: true }))
    setTabErrors((p) => ({ ...p, descricao: '' }))
    try {
      const payload: Record<string, unknown> = {}
      if (descricao.short_description.trim()) payload.short_description = descricao.short_description.trim()
      if (descricao.description.trim()) payload.description = descricao.description.trim()
      await api.patch(`/products/${productId}`, payload)
      markSaved('descricao')
    } catch (err) {
      setTabErrors((p) => ({ ...p, descricao: extractApiError(err) }))
    } finally {
      setSaving((p) => ({ ...p, descricao: false }))
    }
  }, [descricao, productId])

  const savePrecificacao = useCallback(async () => {
    if (!productId) return
    setSavingPricing(true)
    setPricingError('')
    try {
      const payload: Record<string, unknown> = { discount_enabled: precificacao.discount_enabled }
      if (precificacao.cost_price) payload.cost_price_cents = Math.round(parseFloat(precificacao.cost_price) * 100)
      if (precificacao.sale_price) payload.sale_price_cents = Math.round(parseFloat(precificacao.sale_price) * 100)
      if (precificacao.promotional_price) payload.promotional_price_cents = Math.round(parseFloat(precificacao.promotional_price) * 100)
      if (precificacao.discount_enabled && precificacao.max_discount_pct) payload.max_discount_pct = parseFloat(precificacao.max_discount_pct)
      await api.patch(`/products/${productId}/pricing`, payload)
      setPricingSaved(true)
    } catch (err) {
      setPricingError(extractApiError(err))
    } finally {
      setSavingPricing(false)
    }
  }, [precificacao, productId])

  const saveEntrega = useCallback(async () => {
    if (!productId) return
    setSaving((p) => ({ ...p, entrega: true }))
    setTabErrors((p) => ({ ...p, entrega: '' }))
    try {
      const payload: Record<string, unknown> = { free_shipping: entrega.free_shipping, ships_from_store: entrega.ships_from_store }
      if (entrega.weight_grams) payload.weight_grams = parseInt(entrega.weight_grams)
      if (entrega.height_cm) payload.height_cm = parseFloat(entrega.height_cm)
      if (entrega.width_cm) payload.width_cm = parseFloat(entrega.width_cm)
      if (entrega.depth_cm) payload.depth_cm = parseFloat(entrega.depth_cm)
      await api.patch(`/products/${productId}/delivery`, payload)
      markSaved('entrega')
    } catch (err) {
      setTabErrors((p) => ({ ...p, entrega: extractApiError(err) }))
    } finally {
      setSaving((p) => ({ ...p, entrega: false }))
    }
  }, [entrega, productId])

  const saveFiscal = useCallback(async () => {
    if (!productId) return
    setSaving((p) => ({ ...p, fiscal: true }))
    setTabErrors((p) => ({ ...p, fiscal: '' }))
    try {
      const payload: Record<string, unknown> = {}
      if (fiscal.ncm) payload.ncm = fiscal.ncm
      if (fiscal.cfop) payload.cfop = fiscal.cfop
      if (fiscal.cest) payload.cest = fiscal.cest
      if (fiscal.origem !== '') payload.origem = parseInt(fiscal.origem)
      if (fiscal.regime === 'cst') {
        if (fiscal.cst_icms) payload.cst_icms = fiscal.cst_icms
        payload.csosn = null
      } else {
        if (fiscal.csosn) payload.csosn = fiscal.csosn
        payload.cst_icms = null
      }
      if (fiscal.cst_pis) payload.cst_pis = fiscal.cst_pis
      if (fiscal.cst_cofins) payload.cst_cofins = fiscal.cst_cofins
      if (fiscal.cst_ipi) payload.cst_ipi = fiscal.cst_ipi
      if (fiscal.aliquota_icms) payload.aliquota_icms = parseFloat(fiscal.aliquota_icms)
      if (fiscal.aliquota_pis) payload.aliquota_pis = parseFloat(fiscal.aliquota_pis)
      if (fiscal.aliquota_cofins) payload.aliquota_cofins = parseFloat(fiscal.aliquota_cofins)
      if (fiscal.aliquota_ipi) payload.aliquota_ipi = parseFloat(fiscal.aliquota_ipi)
      await api.patch(`/products/${productId}/fiscal`, payload)
      markSaved('fiscal')
    } catch (err) {
      setTabErrors((p) => ({ ...p, fiscal: extractApiError(err) }))
    } finally {
      setSaving((p) => ({ ...p, fiscal: false }))
    }
  }, [fiscal, productId])

  const saveSeo = useCallback(async () => {
    if (!productId) return
    setSaving((p) => ({ ...p, seo: true }))
    setTabErrors((p) => ({ ...p, seo: '' }))
    try {
      const payload: Record<string, unknown> = {}
      if (seo.seo_title.trim()) payload.seo_title = seo.seo_title.trim()
      if (seo.seo_description.trim()) payload.seo_description = seo.seo_description.trim()
      if (seo.seo_keywords.trim()) payload.seo_keywords = seo.seo_keywords.split(',').map((k) => k.trim()).filter(Boolean)
      if (seo.schema_org_json.trim()) {
        try { payload.schema_org_json = JSON.parse(seo.schema_org_json) }
        catch { setTabErrors((p) => ({ ...p, seo: 'JSON do Schema.org inválido' })); setSaving((p) => ({ ...p, seo: false })); return }
      }
      await api.patch(`/products/${productId}/seo`, payload)
      markSaved('seo')
    } catch (err) {
      setTabErrors((p) => ({ ...p, seo: extractApiError(err) }))
    } finally {
      setSaving((p) => ({ ...p, seo: false }))
    }
  }, [seo, productId])

  async function generateSeo() {
    if (!productId) return
    setGeneratingSeo(true)
    try { await api.post(`/products/${productId}/seo/generate`); setSeoQueued(true) }
    finally { setGeneratingSeo(false) }
  }

  async function handlePublish() {
    if (!productId) return
    setPublishing(true)
    try {
      await api.patch(`/products/${productId}`, { active: true })
      setPublished(true)
      navigate('/produtos')
    } catch { setPublishing(false) }
  }

  const isLocked = !productId
  const canPublish = !!productId
  const sale = parseFloat(precificacao.sale_price) || 0
  const cost = parseFloat(precificacao.cost_price) || 0
  const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0
  const profit = sale - cost

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
            <span className="font-medium text-foreground">{basicos.name.trim() || 'Novo produto'}</span>
          </div>
          {productId && !published && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              Rascunho
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          {!productId && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Preencha os dados básicos e salve para criar o rascunho. As demais abas ficam disponíveis em seguida.
              </p>
            </div>
          )}

          <div className="grid grid-cols-12 gap-6">
            {/* ── LEFT: Tabs ─────────────────────────── */}
            <div className="col-span-12 lg:col-span-9">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                <div className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
                  <TabsList variant="line" className="mb-5 w-max min-w-full justify-start gap-1 border-b border-border pb-0">
                    {TABS.map(({ key, label }) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        disabled={key !== 'basicos' && isLocked}
                        className="relative whitespace-nowrap px-3 pb-3"
                      >
                        <span>{label}</span>
                        {savedTabs[key] && (
                          <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                            <Check className="h-2.5 w-2.5 text-success" />
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* BÁSICOS */}
                <TabsContent value="basicos">
                  <FormCard error={tabErrors.basicos} onSave={saveBasicos} saving={saving.basicos} saveLabel={productId ? 'Salvar alterações' : 'Criar rascunho'}>
                    <FormSection title="Identificação">
                      <Field label="Nome *">
                        <Input placeholder="Ex: Ração Royal Canin Adulto 15kg" value={basicos.name} onChange={(e) => setB('name', e.target.value)} autoFocus />
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="SKU">
                          <Input placeholder="Ex: RC-ADULT-15KG" value={basicos.sku} onChange={(e) => setB('sku', e.target.value)} />
                        </Field>
                        <Field label="Código de barras">
                          <Input placeholder="EAN-8 / EAN-13 / UPC" value={basicos.barcode} onChange={(e) => setB('barcode', e.target.value)} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Unidade">
                          <Input placeholder="Ex: UN, KG, L, CX" value={basicos.unit} onChange={(e) => setB('unit', e.target.value)} />
                        </Field>
                        <Field label="Estoque mínimo">
                          <Input type="number" min="0" step="1" placeholder="0" value={basicos.min_stock} onChange={(e) => setB('min_stock', e.target.value)} />
                        </Field>
                      </div>
                    </FormSection>
                    <FormSection title="Classificação">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Categoria">
                          <Select value={basicos.category_id || '__none__'} onValueChange={(v) => setB('category_id', v === '__none__' ? '' : v)}>
                            <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sem categoria</SelectItem>
                              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Marca">
                          <Select value={basicos.brand_id || '__none__'} onValueChange={(v) => setB('brand_id', v === '__none__' ? '' : v)}>
                            <SelectTrigger><SelectValue placeholder="Sem marca" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sem marca</SelectItem>
                              {marcas.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <div className="pt-1">
                        <ToggleChip label="Destaque" active={basicos.featured} onClick={() => setB('featured', !basicos.featured)} />
                      </div>
                    </FormSection>
                  </FormCard>
                </TabsContent>

                {/* DESCRIÇÃO */}
                <TabsContent value="descricao">
                  <FormCard error={tabErrors.descricao} onSave={saveDescricao} saving={saving.descricao}>
                    <FormSection title="Textos">
                      <Field label="Descrição curta">
                        <Input placeholder="Resumo para listagens e e-commerce (máx. 500 chars)" value={descricao.short_description} onChange={(e) => setD('short_description', e.target.value)} maxLength={500} />
                      </Field>
                      <Field label="Descrição completa">
                        <textarea
                          rows={8}
                          placeholder="Detalhes, composição, instruções de uso, ingredientes..."
                          value={descricao.description}
                          onChange={(e) => setD('description', e.target.value)}
                          className="flex min-h-[160px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </Field>
                    </FormSection>
                  </FormCard>
                </TabsContent>

                {/* ENTREGA */}
                <TabsContent value="entrega">
                  <FormCard error={tabErrors.entrega} onSave={saveEntrega} saving={saving.entrega}>
                    <FormSection title="Dimensões e Peso">
                      <Field label="Peso bruto (g)" hint="Peso total com embalagem, em gramas">
                        <div className="relative w-48">
                          <Input type="number" min="0" step="1" placeholder="0" value={entrega.weight_grams} onChange={(e) => setE('weight_grams', e.target.value)} className="pr-6" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
                        </div>
                      </Field>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Altura (cm)">
                          <div className="relative">
                            <Input type="number" min="0" step="0.1" placeholder="0" value={entrega.height_cm} onChange={(e) => setE('height_cm', e.target.value)} className="pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                          </div>
                        </Field>
                        <Field label="Largura (cm)">
                          <div className="relative">
                            <Input type="number" min="0" step="0.1" placeholder="0" value={entrega.width_cm} onChange={(e) => setE('width_cm', e.target.value)} className="pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                          </div>
                        </Field>
                        <Field label="Profundidade (cm)">
                          <div className="relative">
                            <Input type="number" min="0" step="0.1" placeholder="0" value={entrega.depth_cm} onChange={(e) => setE('depth_cm', e.target.value)} className="pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                          </div>
                        </Field>
                      </div>
                    </FormSection>
                    <FormSection title="Opções de Frete">
                      <div className="flex flex-wrap gap-3">
                        <ToggleChip label="Frete grátis" active={entrega.free_shipping} onClick={() => setE('free_shipping', !entrega.free_shipping)} />
                        <ToggleChip label="Entrega na loja" active={entrega.ships_from_store} onClick={() => setE('ships_from_store', !entrega.ships_from_store)} />
                      </div>
                    </FormSection>
                  </FormCard>
                </TabsContent>

                {/* FISCAL */}
                <TabsContent value="fiscal">
                  <FormCard error={tabErrors.fiscal} onSave={saveFiscal} saving={saving.fiscal}>
                    <FormSection title="Codificação Fiscal">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="NCM" hint="8 dígitos — Nomenclatura Comum do Mercosul">
                          <Input placeholder="00000000" value={fiscal.ncm} onChange={(e) => setF('ncm', e.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" maxLength={8} />
                        </Field>
                        <Field label="CFOP" hint="4 ou 5 dígitos — Código Fiscal de Operações">
                          <Input placeholder="5102" value={fiscal.cfop} onChange={(e) => setF('cfop', e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" maxLength={5} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="CEST" hint="7 dígitos — opcional">
                          <Input placeholder="0000000" value={fiscal.cest} onChange={(e) => setF('cest', e.target.value.replace(/\D/g, '').slice(0, 7))} inputMode="numeric" maxLength={7} />
                        </Field>
                        <Field label="Origem">
                          <Select value={fiscal.origem || '__none__'} onValueChange={(v) => setF('origem', v === '__none__' ? '' : v)}>
                            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Selecionar</SelectItem>
                              {ORIGENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </FormSection>
                    <FormSection title="Tributação ICMS" hint="CST para Lucro Real/Presumido · CSOSN para Simples Nacional">
                      <div className="flex gap-2">
                        <ToggleChip label="CST" active={fiscal.regime === 'cst'} onClick={() => setF('regime', 'cst')} />
                        <ToggleChip label="CSOSN" active={fiscal.regime === 'csosn'} onClick={() => setF('regime', 'csosn')} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {fiscal.regime === 'cst' ? (
                          <Field label="CST ICMS" hint="3 dígitos">
                            <Input placeholder="000" value={fiscal.cst_icms} onChange={(e) => setF('cst_icms', e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" maxLength={3} />
                          </Field>
                        ) : (
                          <Field label="CSOSN" hint="3 dígitos">
                            <Input placeholder="000" value={fiscal.csosn} onChange={(e) => setF('csosn', e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" maxLength={3} />
                          </Field>
                        )}
                        <Field label="Alíquota ICMS">
                          <div className="relative">
                            <Input type="number" min="0" max="100" step="0.01" placeholder="0,00" value={fiscal.aliquota_icms} onChange={(e) => setF('aliquota_icms', e.target.value)} className="pr-7" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                          </div>
                        </Field>
                      </div>
                    </FormSection>
                    <FormSection title="PIS / COFINS / IPI">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="CST PIS" hint="2 dígitos">
                          <Input placeholder="00" value={fiscal.cst_pis} onChange={(e) => setF('cst_pis', e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" maxLength={2} />
                        </Field>
                        <Field label="Alíquota PIS">
                          <div className="relative">
                            <Input type="number" min="0" max="100" step="0.01" placeholder="0,00" value={fiscal.aliquota_pis} onChange={(e) => setF('aliquota_pis', e.target.value)} className="pr-7" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                          </div>
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="CST COFINS" hint="2 dígitos">
                          <Input placeholder="00" value={fiscal.cst_cofins} onChange={(e) => setF('cst_cofins', e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" maxLength={2} />
                        </Field>
                        <Field label="Alíquota COFINS">
                          <div className="relative">
                            <Input type="number" min="0" max="100" step="0.01" placeholder="0,00" value={fiscal.aliquota_cofins} onChange={(e) => setF('aliquota_cofins', e.target.value)} className="pr-7" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                          </div>
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="CST IPI" hint="2 dígitos — opcional">
                          <Input placeholder="00" value={fiscal.cst_ipi} onChange={(e) => setF('cst_ipi', e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" maxLength={2} />
                        </Field>
                        <Field label="Alíquota IPI">
                          <div className="relative">
                            <Input type="number" min="0" max="100" step="0.01" placeholder="0,00" value={fiscal.aliquota_ipi} onChange={(e) => setF('aliquota_ipi', e.target.value)} className="pr-7" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                          </div>
                        </Field>
                      </div>
                    </FormSection>
                  </FormCard>
                </TabsContent>

                {/* SEO */}
                <TabsContent value="seo">
                  <FormCard error={tabErrors.seo} onSave={saveSeo} saving={saving.seo}>
                    <FormSection title="Meta Tags" hint="Dados exibidos no Google e outros mecanismos de busca">
                      <Field label="Título SEO" trailing={<CharCount value={seo.seo_title} max={70} />}>
                        <Input placeholder="Título para motores de busca (máx. 70 caracteres)" value={seo.seo_title} onChange={(e) => setS('seo_title', e.target.value)} maxLength={70} />
                      </Field>
                      <Field label="Meta descrição" trailing={<CharCount value={seo.seo_description} max={160} />}>
                        <textarea
                          rows={3}
                          placeholder="Descrição exibida nos resultados de busca (máx. 160 caracteres)"
                          value={seo.seo_description}
                          onChange={(e) => setS('seo_description', e.target.value)}
                          maxLength={160}
                          className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </Field>
                      <Field label="Palavras-chave" hint="Separe por vírgula: ração gato, ração adulto, royal canin">
                        <Input placeholder="palavra1, palavra2, palavra3" value={seo.seo_keywords} onChange={(e) => setS('seo_keywords', e.target.value)} />
                      </Field>
                    </FormSection>
                    <FormSection title="Schema.org JSON-LD" hint="Dados estruturados para rich results no Google.">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Ref:{' '}
                          <a href="https://schema.org/Product" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">schema.org/Product</a>
                        </span>
                        {productId && (
                          <Button variant="outline" size="sm" onClick={generateSeo} disabled={generatingSeo || seoQueued} className="gap-1.5 h-7 text-xs">
                            <Sparkles className="h-3 w-3" />
                            {seoQueued ? 'Em geração...' : generatingSeo ? 'Enviando...' : 'Gerar com IA'}
                          </Button>
                        )}
                      </div>
                      {seoQueued && (
                        <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/30 px-3 py-2">
                          Geração em fila. Os dados aparecerão aqui ao recarregar a página em instantes.
                        </p>
                      )}
                      <textarea
                        rows={8}
                        placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Product"\n}'}
                        value={seo.schema_org_json}
                        onChange={(e) => setS('schema_org_json', e.target.value)}
                        className="flex min-h-[160px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        spellCheck={false}
                      />
                    </FormSection>
                  </FormCard>
                </TabsContent>

                {/* MÍDIA */}
                <TabsContent value="midia">
                  <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-4">
                    {!productId ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/30">
                          <Image className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Crie o rascunho primeiro</p>
                          <p className="text-xs text-muted-foreground mt-1">Salve os dados básicos para liberar esta seção</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Upload disponível em breve</p>
                          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">O módulo de storage está em desenvolvimento. Fotos e vídeos poderão ser adicionados assim que estiver pronto.</p>
                        </div>
                        <div className="flex cursor-not-allowed flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/10 py-14 opacity-40">
                          <Upload className="h-7 w-7 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground">Arraste ou clique para adicionar</p>
                            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, GIF, WEBP, MP4 · máx 50 MB por arquivo</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* ── RIGHT: Pricing sidebar ────────────── */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-6 rounded-lg border border-border bg-card shadow-sm">
                {/* Pricing header */}
                <div className="border-b border-border/60 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Precificação</h2>
                    {pricingSaved && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
                        <Check className="h-3 w-3 text-success" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Pricing fields */}
                <div className="space-y-4 px-5 py-4">
                  {pricingError && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {pricingError}
                    </div>
                  )}
                  <Field label="Custo">
                    <PriceInput placeholder="0,00" value={precificacao.cost_price} onChange={(v) => setP('cost_price', v)} />
                  </Field>
                  <Field label="Venda">
                    <PriceInput placeholder="0,00" value={precificacao.sale_price} onChange={(v) => setP('sale_price', v)} />
                  </Field>
                  <Field label="Promocional">
                    <PriceInput placeholder="Opcional" value={precificacao.promotional_price} onChange={(v) => setP('promotional_price', v)} />
                  </Field>

                  {/* Margin indicator */}
                  {sale > 0 && (
                    <div className="rounded-md bg-muted/40 px-3 py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Margem bruta</span>
                        <span className={cn('text-sm font-semibold', margin >= 0 ? 'text-success' : 'text-destructive')}>
                          {margin.toFixed(1)}%
                        </span>
                      </div>
                      {cost > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Lucro unit.</span>
                          <span className="text-xs font-medium text-foreground">
                            R$ {profit.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Discount */}
                  <div className="space-y-2 pt-1">
                    <ToggleChip label="Habilitar desconto" active={precificacao.discount_enabled} onClick={() => setP('discount_enabled', !precificacao.discount_enabled)} />
                    {precificacao.discount_enabled && (
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-xs text-muted-foreground">Máx.</span>
                        <div className="relative w-20">
                          <Input type="number" min="0" max="100" step="1" placeholder="0" value={precificacao.max_discount_pct} onChange={(e) => setP('max_discount_pct', e.target.value)} className="h-8 pr-6 text-sm" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing calculator */}
                <PricingCalculator
                  costPriceStr={precificacao.cost_price}
                  onUseSuggestedPrice={(price) => setP('sale_price', price)}
                />

                {/* Divider + Actions */}
                <div className="border-t border-border/60 px-5 py-4 space-y-2.5">
                  {!productId && (
                    <p className="text-center text-xs text-muted-foreground pb-1">
                      Salve os dados básicos para ativar
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={savePrecificacao}
                    disabled={savingPricing || !productId}
                    className="w-full"
                  >
                    {savingPricing ? 'Salvando...' : 'Salvar informações'}
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={!canPublish || publishing || published}
                    className="w-full gap-2"
                  >
                    {published
                      ? <><Check className="h-4 w-4" />Publicado</>
                      : publishing
                        ? 'Publicando...'
                        : 'Publicar produto'
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
